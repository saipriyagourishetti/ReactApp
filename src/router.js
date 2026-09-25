'use strict';

const { sendJson } = require('./http');

/**
 * A declarative, exact-match router.
 *
 * Routes are plain data — `{ 'GET /api/me': handler }` — which keeps the whole
 * API surface readable in one glance and makes 405 handling automatic: if the
 * path exists under any other method, the allowed methods are advertised.
 */

/** Split a `'GET /api/me'` (or `'GET|HEAD /'`) key into methods + path. */
function parseRouteKey(key) {
  const separator = key.indexOf(' ');
  if (separator < 1) {
    throw new TypeError(`Invalid route key: "${key}" (expected "METHOD /path")`);
  }

  const methods = key
    .slice(0, separator)
    .split('|')
    .map((method) => method.trim().toUpperCase())
    .filter(Boolean);
  const path = key.slice(separator + 1).trim();

  if (methods.length === 0 || !path.startsWith('/')) {
    throw new TypeError(`Invalid route key: "${key}" (expected "METHOD /path")`);
  }
  return { methods, path };
}

/**
 * Build a router middleware from a route table.
 *
 * @param {Record<string, Function>} table  `'METHOD /path' -> handler(ctx)`
 * @param {object} [options]
 * @param {string} [options.prefix]  Paths under this prefix get JSON 404s
 *   instead of falling through to the static file handler.
 */
function createRouter(table, { prefix = '/api/' } = {}) {
  /** path -> Map<method, handler> */
  const routes = new Map();

  for (const [key, handler] of Object.entries(table)) {
    if (typeof handler !== 'function') {
      throw new TypeError(`Route "${key}" must map to a function`);
    }

    const { methods, path } = parseRouteKey(key);
    if (!routes.has(path)) routes.set(path, new Map());

    const byMethod = routes.get(path);
    for (const method of methods) {
      if (byMethod.has(method)) {
        throw new Error(`Duplicate route: ${method} ${path}`);
      }
      byMethod.set(method, handler);
    }
  }

  function router(ctx, next) {
    const byMethod = routes.get(ctx.pathname);

    if (byMethod) {
      const handler =
        byMethod.get(ctx.method) ||
        // HEAD falls back to GET; Node suppresses the body automatically.
        (ctx.method === 'HEAD' ? byMethod.get('GET') : undefined);

      if (handler) return handler(ctx);

      const allow = [...byMethod.keys()].sort().join(', ');
      sendJson(
        ctx.res,
        405,
        { error: `Method not allowed. Use ${[...byMethod.keys()].sort().join(' or ')}.` },
        { Allow: allow }
      );
      return undefined;
    }

    // Unknown API paths must not fall through to the static file handler,
    // otherwise a missing endpoint would return an HTML 404 page.
    if (prefix && ctx.pathname.startsWith(prefix)) {
      sendJson(ctx.res, 404, { error: `Unknown endpoint: ${ctx.pathname}` });
      return undefined;
    }

    return next();
  }

  /** Introspection helper — used by tests and the /api/health route listing. */
  router.list = () =>
    [...routes.entries()]
      .flatMap(([path, byMethod]) => [...byMethod.keys()].map((method) => `${method} ${path}`))
      .sort();

  return router;
}

module.exports = { createRouter, parseRouteKey };
