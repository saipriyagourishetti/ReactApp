'use strict';

const http = require('http');

const { loadConfig } = require('./config');
const { UserStore } = require('./userStore');
const { SessionStore } = require('./sessionStore');
const { RateLimiter } = require('./rateLimiter');
const { createRouter } = require('./router');
const { createStaticHandler } = require('./static');
const { attachAuth } = require('./auth');
const { routes } = require('./routes');
const {
  compose,
  createContext,
  requestLogger,
  errorHandler,
  notFoundHandler,
} = require('./middleware');

/**
 * The composition root.
 *
 * Builds the stores, assembles the middleware chain and returns both the
 * `http.Server` and the pieces tests need. Every dependency is created here and
 * injected through `ctx`, so nothing below this file holds mutable global state
 * and a test can spin up a fully isolated app per case.
 */

/**
 * @param {object} [options]
 * @param {object} [options.config]  Overrides merged over the env-based config.
 * @param {UserStore} [options.users]
 * @param {SessionStore} [options.sessions]
 * @param {RateLimiter} [options.loginLimiter]
 */
function createApp(options = {}) {
  const config = loadConfig(options.config || {});

  const users = options.users || new UserStore(config.seedUsers);
  const sessions =
    options.sessions || new SessionStore({ ttlMs: config.sessionTtlMs });
  const loginLimiter =
    options.loginLimiter ||
    new RateLimiter({ limit: config.loginLimit, windowMs: config.loginWindowMs });

  const deps = { config, users, sessions, loginLimiter, startedAt: Date.now() };

  const router = createRouter(routes, { prefix: '/api/' });

  // Order matters: logging wraps everything, errors are caught outside the
  // routes, auth is resolved before any guard runs, and static files are the
  // last resort for non-API paths.
  const chain = compose([
    requestLogger({ quiet: config.quiet }),
    errorHandler({ quiet: config.quiet }),
    attachAuth(),
    router,
    createStaticHandler({ publicDir: config.publicDir }),
  ]);

  const handler = (req, res) => {
    const ctx = createContext(req, res, deps);
    chain(ctx, notFoundHandler()).catch((err) => {
      // Only reachable if the error middleware itself fails.
      if (!config.quiet) console.error('Fatal middleware failure:', err);
      if (!res.headersSent) res.writeHead(500);
      if (!res.writableEnded) res.end();
    });
  };

  const server = http.createServer(handler);

  /** Purge expired sessions and stale rate-limit keys periodically. */
  const sweeper = setInterval(() => {
    sessions.sweep();
    loginLimiter.sweep();
  }, config.sweepIntervalMs);
  sweeper.unref();
  server.on('close', () => clearInterval(sweeper));

  return { server, handler, config, users, sessions, loginLimiter, router, deps };
}

module.exports = { createApp };
