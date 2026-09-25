'use strict';

const { sendJson, badRequest } = require('../http');
const { ROLES } = require('./auth.routes');

/**
 * GET /api/users — everything in the store.
 *
 * Supports an optional `?role=` filter, validated against the known roles so a
 * typo returns a clear 400 rather than a silently empty list.
 */
function listUsers(ctx) {
  const role = ctx.query.get('role');

  if (role !== null && role !== '' && !ROLES.includes(role)) {
    throw badRequest(`Unknown role "${role}". Expected one of: ${ROLES.join(', ')}.`, 'role');
  }

  const users = role ? ctx.users.list({ role }) : ctx.users.list();
  sendJson(ctx.res, 200, { count: role ? users.length : ctx.users.size, users });
}

const routes = {
  'GET /api/users': listUsers,
};

module.exports = { routes, listUsers };
