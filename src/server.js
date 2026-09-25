'use strict';

const { createApp } = require('./app');
const { loadConfig } = require('./config');
const { UserStore } = require('./userStore');
const { SessionStore } = require('./sessionStore');
const { RateLimiter } = require('./rateLimiter');

/**
 * Process entrypoint.
 *
 * All the wiring now lives in src/app.js; this file only owns the shared
 * default stores, the listen call and the startup banner.
 */

const config = loadConfig();

/**
 * Stores shared by every server created from this module.
 *
 * Exported for the integration tests, which assert against the same instances
 * the handlers mutate. Prefer `createApp()` for anything that needs isolation.
 */
const store = new UserStore(config.seedUsers);
const sessions = new SessionStore({ ttlMs: config.sessionTtlMs });
const loginLimiter = new RateLimiter({
  limit: config.loginLimit,
  windowMs: config.loginWindowMs,
});

/**
 * Create a server backed by the shared stores.
 */
function createServer() {
  return createApp({ users: store, sessions, loginLimiter }).server;
}

function start(port = config.port) {
  const server = createServer();

  server.listen(port, () => {
    console.log('=== Dummy Project Web ===');
    console.log(`Landing page : http://localhost:${port}/`);
    console.log(`Signup page  : http://localhost:${port}/signup.html`);
    console.log(`Login page   : http://localhost:${port}/login.html`);
    console.log(`Users API    : http://localhost:${port}/api/users`);
    console.log(`Health check : http://localhost:${port}/api/health`);
    console.log('\nDemo account : ada@example.com / analytical1');
    console.log('\nPress Ctrl+C to stop.');
  });

  return server;
}

if (require.main === module) {
  start();
}

module.exports = { createServer, start, createApp, store, sessions, loginLimiter, config };
