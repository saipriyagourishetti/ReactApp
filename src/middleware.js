'use strict';

const { HttpError, sendJson } = require('./http');

/**
 * A tiny Koa-style middleware chain.
 *
 * Each middleware is `async (ctx, next) => {}` and decides whether to call
 * `next()`. `ctx` carries the request, response, parsed pathname and the
 * injected dependencies, so handlers never reach for module-level singletons.
 */

/**
 * Compose middleware into a single `(ctx) => Promise<void>` function.
 *
 * Calling `next()` twice in one middleware is a programming error and throws,
 * which surfaces double-send bugs immediately rather than as a corrupt response.
 */
function compose(middlewares) {
  const stack = middlewares.filter(Boolean);

  return function run(ctx, done) {
    let index = -1;

    function dispatch(i) {
      if (i <= index) {
        return Promise.reject(new Error('next() called multiple times'));
      }
      index = i;

      const fn = i === stack.length ? done : stack[i];
      if (!fn) return Promise.resolve();

      try {
        return Promise.resolve(fn(ctx, () => dispatch(i + 1)));
      } catch (err) {
        return Promise.reject(err);
      }
    }

    return dispatch(0);
  };
}

/**
 * Build the per-request context object.
 */
function createContext(req, res, deps) {
  let pathname = '/';
  let query = new URLSearchParams();

  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    pathname = url.pathname;
    query = url.searchParams;
  } catch (err) {
    // Leave the defaults; the router will 404 and the malformed URL is logged.
  }

  return {
    req,
    res,
    method: req.method,
    pathname,
    query,
    /** Populated by the auth middleware/guard when a session is present. */
    auth: null,
    /** Injected stores and config — never imported directly by handlers. */
    ...deps,
  };
}

/**
 * Access log: one line per completed response.
 *
 * Attached to the `finish` event so the real status code is reported even when
 * a later middleware replaced it.
 */
function requestLogger({ quiet = false, log = console.log } = {}) {
  return function logger(ctx, next) {
    if (quiet) return next();

    const startedAt = process.hrtime.bigint();
    ctx.res.on('finish', () => {
      const ms = Number(process.hrtime.bigint() - startedAt) / 1e6;
      log(
        `${new Date().toISOString()} ${ctx.method} ${ctx.req.url} ` +
          `${ctx.res.statusCode} ${ms.toFixed(1)}ms`
      );
    });

    return next();
  };
}

/**
 * Outermost middleware: converts thrown errors into responses.
 *
 * `HttpError` becomes its intended status; anything else is an unexpected bug,
 * so it is logged in full and reported as a generic 500 without leaking
 * internals to the client.
 */
function errorHandler({ quiet = false, logError = console.error } = {}) {
  return async function handleErrors(ctx, next) {
    try {
      await next();
    } catch (err) {
      if (ctx.res.writableEnded || ctx.res.headersSent) {
        if (!quiet) logError('Error after response was sent:', err);
        return;
      }

      if (err instanceof HttpError) {
        sendJson(ctx.res, err.status, err.toBody(), err.headers || {});
        return;
      }

      if (!quiet) logError('Unhandled request error:', err);
      sendJson(ctx.res, 500, { error: 'Internal server error.' });
    }
  };
}

/**
 * Final fallback when no middleware produced a response.
 */
function notFoundHandler() {
  return function handleNotFound(ctx) {
    if (ctx.res.writableEnded) return;
    sendJson(ctx.res, 404, { error: `Not found: ${ctx.pathname}` });
  };
}

module.exports = {
  compose,
  createContext,
  requestLogger,
  errorHandler,
  notFoundHandler,
};
