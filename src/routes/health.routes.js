'use strict';

const { sendJson } = require('../http');

/**
 * GET /api/health — liveness probe for CI and uptime checks.
 *
 * Intentionally unauthenticated and cheap: no store iteration beyond the two
 * O(1) size getters.
 */
function health(ctx) {
  sendJson(ctx.res, 200, {
    status: 'ok',
    uptimeSeconds: Math.floor((Date.now() - ctx.startedAt) / 1000),
    startedAt: new Date(ctx.startedAt).toISOString(),
    users: ctx.users.size,
    sessions: ctx.sessions.size,
    node: process.version,
  });
}

const routes = {
  'GET /api/health': health,
};

module.exports = { routes, health };
