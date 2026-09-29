'use strict';

const { sendJson, badRequest, forbidden, notFound, readJson, stringField } = require('../http');
const { requireAuth } = require('../auth');
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

/**
 * PATCH /api/users/:id — update profile fields for the authenticated user.
 *
 * A regular user may only update their own profile.
 * An admin may update any user's profile.
 * Allowed fields: displayName, bio, notifications.
 */
async function updateUser(ctx) {
  const id = parseInt(ctx.params.id, 10);
  if (!id || id < 1) throw badRequest('Invalid user id.');

  const caller = ctx.auth.user;

  // Only admins can edit other accounts.
  if (caller.id !== id && caller.role !== 'admin') {
    throw forbidden('You do not have permission to update this profile.');
  }

  // Make sure the target user exists.
  const existing = ctx.users.findById(id);
  if (!existing) throw notFound(`No user found with id ${id}.`);

  const data = await readJson(ctx.req, ctx.config.maxBodyBytes);

  const changes = {};

  if (data.displayName !== undefined) {
    const displayName = stringField(data, 'displayName');
    if (displayName.length < 2) {
      throw badRequest('Display name must be at least 2 characters.', 'displayName');
    }
    changes.displayName = displayName;
  }

  if (data.bio !== undefined) {
    const bio = typeof data.bio === 'string' ? data.bio : '';
    if (bio.length > 280) {
      throw badRequest('Bio must be 280 characters or fewer.', 'bio');
    }
    changes.bio = bio;
  }

  if (data.notifications !== undefined && typeof data.notifications === 'object') {
    changes.notifications = data.notifications;
  }

  const user = ctx.users.update(id, changes);
  sendJson(ctx.res, 200, { user });
}

const routes = {
  'GET /api/users': listUsers,
  'PATCH /api/users/:id': requireAuth(updateUser),
};

module.exports = { routes, listUsers, updateUser };
