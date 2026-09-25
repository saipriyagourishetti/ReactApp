'use strict';

const {
  parseCookies,
  buildSessionCookie,
  buildClearCookie,
  SESSION_COOKIE,
} = require('./sessionStore');
const { unauthorized, clientIp } = require('./http');

/**
 * Session plumbing that sits between the raw HTTP layer and the route handlers.
 *
 * Everything takes `ctx`, so these helpers work with whatever stores were
 * injected by `createApp` — no module-level singletons.
 */

/** Read the session token from the request cookies ('' when absent). */
function sessionToken(req) {
  return parseCookies(req.headers.cookie)[SESSION_COOKIE] || '';
}

/**
 * Start a session for a user and return the `Set-Cookie` header value.
 */
function issueSession(ctx, user) {
  const { token } = ctx.sessions.create(user.id, {
    userAgent: ctx.req.headers['user-agent'] || '',
    ip: clientIp(ctx.req),
  });

  return buildSessionCookie(token, {
    maxAgeMs: ctx.sessions.ttlMs,
    secure: ctx.config.cookieSecure,
  });
}

/** Header value that clears the session cookie on the client. */
function clearSessionCookie(ctx) {
  return buildClearCookie({ secure: ctx.config.cookieSecure });
}

/**
 * Resolve the caller's session and user, sliding the expiry forward.
 *
 * Returns null when there is no valid session, or when the user has since been
 * removed — in which case the orphaned session is cleaned up.
 */
function resolveAuth(ctx) {
  const token = sessionToken(ctx.req);
  if (!token) return null;

  const session = ctx.sessions.touch(token);
  if (!session) return null;

  const user = ctx.users.findById(session.userId);
  if (!user) {
    ctx.sessions.destroy(token);
    return null;
  }
  return { token, session, user };
}

/**
 * Middleware: attaches `ctx.auth` when a valid session cookie is present.
 *
 * Runs for every request and never rejects, so public routes can branch on
 * `ctx.auth` without needing their own lookup.
 */
function attachAuth() {
  return function attach(ctx, next) {
    ctx.auth = resolveAuth(ctx);
    return next();
  };
}

/**
 * Wrap a handler so it only runs for authenticated callers.
 *
 * On failure it throws a 401 that also clears the stale cookie, so a client
 * holding an expired token stops sending it.
 */
function requireAuth(handler) {
  return function guarded(ctx) {
    if (!ctx.auth) {
      throw unauthorized('Authentication required. Please log in.', {
        headers: { 'Set-Cookie': clearSessionCookie(ctx) },
      });
    }
    return handler(ctx);
  };
}

/** Serialise a session for an API response (never includes the token). */
function publicSession(session) {
  return {
    createdAt: session.createdAt,
    lastSeenAt: session.lastSeenAt,
    expiresAt: new Date(session.expiresAt).toISOString(),
  };
}

module.exports = {
  sessionToken,
  issueSession,
  clearSessionCookie,
  resolveAuth,
  attachAuth,
  requireAuth,
  publicSession,
};
