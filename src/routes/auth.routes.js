'use strict';

const { validatePassword } = require('../userStore');
const {
  badRequest,
  unauthorized,
  conflict,
  sendJson,
  readJson,
  clientIp,
  stringField,
  rawField,
  HttpError,
} = require('../http');
const {
  sessionToken,
  issueSession,
  clearSessionCookie,
  requireAuth,
  publicSession,
} = require('../auth');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLES = ['user', 'editor', 'admin'];
const MIN_NAME_LENGTH = 2;

/**
 * POST /api/signup — create an account and log straight in.
 */
async function signup(ctx) {
  const data = await readJson(ctx.req, ctx.config.maxBodyBytes);

  const name = stringField(data, 'name');
  const email = stringField(data, 'email');
  const password = rawField(data, 'password');
  const role = ROLES.includes(data.role) ? data.role : 'user';

  if (name.length < MIN_NAME_LENGTH) {
    throw badRequest(
      `Please provide a name with at least ${MIN_NAME_LENGTH} characters.`,
      'name'
    );
  }
  if (!EMAIL_PATTERN.test(email)) {
    throw badRequest('Please provide a valid email address.', 'email');
  }

  const passwordProblem = validatePassword(password);
  if (passwordProblem) throw badRequest(passwordProblem, 'password');

  if (ctx.users.findByEmail(email)) {
    throw conflict('An account with this email already exists.', 'email');
  }

  let user;
  try {
    user = ctx.users.create({ name, email, role, password });
  } catch (err) {
    // The store's own validation is the last line of defence.
    throw badRequest(err.message);
  }

  sendJson(ctx.res, 201, { user }, { 'Set-Cookie': issueSession(ctx, user) });
}

/**
 * POST /api/login — verify credentials, throttle failures, issue a session.
 */
async function login(ctx) {
  const data = await readJson(ctx.req, ctx.config.maxBodyBytes);

  const email = stringField(data, 'email');
  const password = rawField(data, 'password');

  if (!email) throw badRequest('Please enter your email address.', 'email');
  if (!password) throw badRequest('Please enter your password.', 'password');

  // Key on ip + email so one noisy address cannot lock out another account.
  const key = `${clientIp(ctx.req)}|${email.toLowerCase()}`;
  const state = ctx.loginLimiter.check(key);

  if (state.limited) {
    const retryAfter = Math.ceil(state.retryAfterMs / 1000);
    throw new HttpError(429, `Too many failed attempts. Try again in ${retryAfter} second(s).`, {
      headers: { 'Retry-After': String(retryAfter) },
    });
  }

  const user = ctx.users.verifyCredentials(email, password);

  // Deliberately generic: do not reveal whether the email exists.
  if (!user) {
    const after = ctx.loginLimiter.fail(key);
    sendJson(ctx.res, 401, {
      error: 'Incorrect email or password.',
      attemptsRemaining: after.remaining,
    });
    return;
  }

  ctx.loginLimiter.reset(key);
  sendJson(ctx.res, 200, { user }, { 'Set-Cookie': issueSession(ctx, user) });
}

/**
 * POST /api/logout — always succeeds, so clients can log out blindly.
 */
function logout(ctx) {
  const token = sessionToken(ctx.req);
  const destroyed = token ? ctx.sessions.destroy(token) : false;

  sendJson(ctx.res, 200, { ok: true, destroyed }, { 'Set-Cookie': clearSessionCookie(ctx) });
}

/**
 * GET /api/me — the current user plus session timings.
 */
function me(ctx) {
  sendJson(ctx.res, 200, {
    user: ctx.auth.user,
    session: publicSession(ctx.auth.session),
  });
}

/**
 * GET /api/sessions — the caller's active devices.
 */
function listSessions(ctx) {
  const current = ctx.auth.session;
  const sessions = ctx.sessions.listForUser(ctx.auth.user.id).map((session) => ({
    ...publicSession(session),
    userAgent: session.userAgent,
    ip: session.ip,
    current: session.createdAt === current.createdAt && session.ip === current.ip,
  }));

  sendJson(ctx.res, 200, { count: sessions.length, sessions });
}

/**
 * POST/PUT /api/password — rotate the password and revoke other sessions.
 */
async function changePassword(ctx) {
  const data = await readJson(ctx.req, ctx.config.maxBodyBytes);

  const currentPassword = rawField(data, 'currentPassword');
  const newPassword = rawField(data, 'newPassword');

  if (!currentPassword) {
    throw badRequest('Please enter your current password.', 'currentPassword');
  }
  if (!ctx.users.verifyCredentials(ctx.auth.user.email, currentPassword)) {
    throw unauthorized('Your current password is incorrect.', { field: 'currentPassword' });
  }

  const problem = validatePassword(newPassword);
  if (problem) throw badRequest(problem, 'newPassword');

  if (newPassword === currentPassword) {
    throw badRequest('Your new password must be different from the current one.', 'newPassword');
  }

  let user;
  try {
    user = ctx.users.setPassword(ctx.auth.user.id, newPassword);
  } catch (err) {
    throw badRequest(err.message, 'newPassword');
  }

  // A rotated password invalidates every other device.
  const revokedSessions = ctx.sessions.destroyAllForUser(ctx.auth.user.id, {
    except: ctx.auth.token,
  });

  sendJson(ctx.res, 200, { user, revokedSessions });
}

/** Route table fragment, merged by src/routes/index.js. */
const routes = {
  'POST /api/signup': signup,
  'POST /api/login': login,
  'POST /api/logout': logout,
  'GET /api/me': requireAuth(me),
  'GET /api/sessions': requireAuth(listSessions),
  'POST|PUT /api/password': requireAuth(changePassword),
};

module.exports = {
  routes,
  signup,
  login,
  logout,
  me,
  listSessions,
  changePassword,
  EMAIL_PATTERN,
  ROLES,
};
