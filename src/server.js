'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { UserStore, validatePassword } = require('./userStore');
const {
  SessionStore,
  parseCookies,
  buildSessionCookie,
  buildClearCookie,
  SESSION_COOKIE,
  DEFAULT_TTL_MS,
} = require('./sessionStore');
const { RateLimiter } = require('./rateLimiter');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const DEFAULT_PORT = Number(process.env.PORT) || 3000;
const STARTED_AT = Date.now();

/** Set COOKIE_SECURE=1 when serving over HTTPS. */
const COOKIE_SECURE = process.env.COOKIE_SECURE === '1';

/** Set QUIET=1 (or NODE_ENV=test) to silence the request log. */
const QUIET = process.env.QUIET === '1' || process.env.NODE_ENV === 'test';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

const store = new UserStore([
  { name: 'Ada Lovelace', email: 'ada@example.com', role: 'admin', password: 'analytical1' },
]);

const sessions = new SessionStore({ ttlMs: DEFAULT_TTL_MS });

/** Throttles failed logins per ip+email: 5 attempts per 15 minutes. */
const loginLimiter = new RateLimiter({ limit: 5, windowMs: 15 * 60 * 1000 });

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function sendJson(res, statusCode, body, headers = {}) {
  const payload = JSON.stringify(body);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    ...headers,
  });
  res.end(payload);
}

function readBody(req, limit = 1e5) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > limit) {
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(raw));
    req.on('error', reject);
  });
}

/**
 * Read and parse a JSON request body.
 * Responds with 400 and returns `undefined` when the payload is unusable.
 */
async function readJson(req, res) {
  try {
    const raw = await readBody(req);
    const data = JSON.parse(raw || '{}');
    if (data === null || typeof data !== 'object' || Array.isArray(data)) {
      sendJson(res, 400, { error: 'Request body must be a JSON object.' });
      return undefined;
    }
    return data;
  } catch (err) {
    sendJson(res, 400, { error: 'Invalid JSON payload.' });
    return undefined;
  }
}

function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

function sessionToken(req) {
  return parseCookies(req.headers.cookie)[SESSION_COOKIE] || '';
}

/**
 * Resolve the caller's session and user, sliding the session expiry forward.
 * Returns null when there is no valid session or the user has since been removed.
 */
function currentAuth(req) {
  const token = sessionToken(req);
  if (!token) return null;

  const session = sessions.touch(token);
  if (!session) return null;

  const user = store.findById(session.userId);
  if (!user) {
    sessions.destroy(token);
    return null;
  }
  return { token, session, user };
}

/**
 * Guard for authenticated routes: responds 401 and returns null when there is
 * no valid session.
 */
function requireAuth(req, res) {
  const auth = currentAuth(req);
  if (!auth) {
    sendJson(res, 401, { error: 'Authentication required. Please log in.' }, {
      'Set-Cookie': buildClearCookie({ secure: COOKIE_SECURE }),
    });
    return null;
  }
  return auth;
}

/**
 * Start a session for a user and return the matching `Set-Cookie` header.
 */
function issueSession(req, user) {
  const { token } = sessions.create(user.id, {
    userAgent: req.headers['user-agent'] || '',
    ip: clientIp(req),
  });
  return buildSessionCookie(token, { maxAgeMs: sessions.ttlMs, secure: COOKIE_SECURE });
}

function logRequest(req, res, startedAt) {
  if (QUIET) return;
  const ms = Number(process.hrtime.bigint() - startedAt) / 1e6;
  console.log(
    `${new Date().toISOString()} ${req.method} ${req.url} ${res.statusCode} ${ms.toFixed(1)}ms`
  );
}

/* ------------------------------------------------------------------ */
/* Static files                                                        */
/* ------------------------------------------------------------------ */

function serveStatic(req, res, pathname) {
  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const filePath = path.join(PUBLIC_DIR, relative);

  // Prevent path traversal outside of the public directory.
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h1>404 &mdash; Not found</h1><p><a href="/">Back to the landing page</a></p>');
      return;
    }
    const type = MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type, 'Content-Length': data.length });
    res.end(data);
  });
}

/* ------------------------------------------------------------------ */
/* Route handlers                                                      */
/* ------------------------------------------------------------------ */

async function handleSignup(req, res) {
  const data = await readJson(req, res);
  if (!data) return;

  const name = typeof data.name === 'string' ? data.name.trim() : '';
  const email = typeof data.email === 'string' ? data.email.trim() : '';
  const password = typeof data.password === 'string' ? data.password : '';
  const role = ['user', 'editor', 'admin'].includes(data.role) ? data.role : 'user';

  if (name.length < 2) {
    sendJson(res, 400, { error: 'Please provide a name with at least 2 characters.', field: 'name' });
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    sendJson(res, 400, { error: 'Please provide a valid email address.', field: 'email' });
    return;
  }

  const passwordProblem = validatePassword(password);
  if (passwordProblem) {
    sendJson(res, 400, { error: passwordProblem, field: 'password' });
    return;
  }

  if (store.findByEmail(email)) {
    sendJson(res, 409, { error: 'An account with this email already exists.', field: 'email' });
    return;
  }

  try {
    const user = store.create({ name, email, role, password });
    // Signing up logs you straight in.
    sendJson(res, 201, { user }, { 'Set-Cookie': issueSession(req, user) });
  } catch (err) {
    sendJson(res, 400, { error: err.message });
  }
}

async function handleLogin(req, res) {
  const data = await readJson(req, res);
  if (!data) return;

  const email = typeof data.email === 'string' ? data.email.trim() : '';
  const password = typeof data.password === 'string' ? data.password : '';

  if (!email) {
    sendJson(res, 400, { error: 'Please enter your email address.', field: 'email' });
    return;
  }
  if (!password) {
    sendJson(res, 400, { error: 'Please enter your password.', field: 'password' });
    return;
  }

  // Key on ip + email so one noisy address cannot lock out another account.
  const key = `${clientIp(req)}|${email.toLowerCase()}`;
  const state = loginLimiter.check(key);

  if (state.limited) {
    const retryAfter = Math.ceil(state.retryAfterMs / 1000);
    sendJson(
      res,
      429,
      {
        error: `Too many failed attempts. Try again in ${retryAfter} second(s).`,
        retryAfter,
      },
      { 'Retry-After': String(retryAfter) }
    );
    return;
  }

  const user = store.verifyCredentials(email, password);

  // Deliberately generic: do not reveal whether the email exists.
  if (!user) {
    const after = loginLimiter.fail(key);
    sendJson(res, 401, {
      error: 'Incorrect email or password.',
      attemptsRemaining: after.remaining,
    });
    return;
  }

  loginLimiter.reset(key);
  sendJson(res, 200, { user }, { 'Set-Cookie': issueSession(req, user) });
}

/**
 * GET /api/me — who am I? Also refreshes the session's sliding expiry.
 */
function handleMe(req, res) {
  const auth = requireAuth(req, res);
  if (!auth) return;

  sendJson(res, 200, {
    user: auth.user,
    session: {
      createdAt: auth.session.createdAt,
      lastSeenAt: auth.session.lastSeenAt,
      expiresAt: new Date(auth.session.expiresAt).toISOString(),
    },
  });
}

/**
 * POST /api/logout — destroy the current session and clear the cookie.
 * Always succeeds, even without a session, so clients can log out blindly.
 */
function handleLogout(req, res) {
  const token = sessionToken(req);
  const destroyed = token ? sessions.destroy(token) : false;

  sendJson(res, 200, { ok: true, destroyed }, {
    'Set-Cookie': buildClearCookie({ secure: COOKIE_SECURE }),
  });
}

/**
 * GET /api/sessions — list the caller's other active devices.
 */
function handleSessions(req, res) {
  const auth = requireAuth(req, res);
  if (!auth) return;

  const list = sessions.listForUser(auth.user.id).map((session) => ({
    createdAt: session.createdAt,
    lastSeenAt: session.lastSeenAt,
    expiresAt: new Date(session.expiresAt).toISOString(),
    userAgent: session.userAgent,
    ip: session.ip,
    current: session.createdAt === auth.session.createdAt && session.ip === auth.session.ip,
  }));

  sendJson(res, 200, { count: list.length, sessions: list });
}

/**
 * POST /api/password — change the logged-in user's password.
 *
 * Requires the current password, and revokes every *other* session on success
 * so a stolen cookie elsewhere stops working.
 */
async function handlePasswordChange(req, res) {
  const auth = requireAuth(req, res);
  if (!auth) return;

  const data = await readJson(req, res);
  if (!data) return;

  const currentPassword = typeof data.currentPassword === 'string' ? data.currentPassword : '';
  const newPassword = typeof data.newPassword === 'string' ? data.newPassword : '';

  if (!currentPassword) {
    sendJson(res, 400, {
      error: 'Please enter your current password.',
      field: 'currentPassword',
    });
    return;
  }

  if (!store.verifyCredentials(auth.user.email, currentPassword)) {
    sendJson(res, 401, { error: 'Your current password is incorrect.', field: 'currentPassword' });
    return;
  }

  const problem = validatePassword(newPassword);
  if (problem) {
    sendJson(res, 400, { error: problem, field: 'newPassword' });
    return;
  }

  if (newPassword === currentPassword) {
    sendJson(res, 400, {
      error: 'Your new password must be different from the current one.',
      field: 'newPassword',
    });
    return;
  }

  try {
    const user = store.setPassword(auth.user.id, newPassword);
    const revoked = sessions.destroyAllForUser(auth.user.id, { except: auth.token });
    sendJson(res, 200, { user, revokedSessions: revoked });
  } catch (err) {
    sendJson(res, 400, { error: err.message, field: 'newPassword' });
  }
}

/**
 * GET /api/health — liveness probe for CI and uptime checks.
 */
function handleHealth(req, res) {
  sendJson(res, 200, {
    status: 'ok',
    uptimeSeconds: Math.floor((Date.now() - STARTED_AT) / 1000),
    startedAt: new Date(STARTED_AT).toISOString(),
    users: store.size,
    sessions: sessions.size,
    node: process.version,
  });
}

/* ------------------------------------------------------------------ */
/* Router                                                              */
/* ------------------------------------------------------------------ */

/** route key -> { methods, handler } */
const ROUTES = {
  '/api/signup': { methods: ['POST'], handler: handleSignup },
  '/api/login': { methods: ['POST'], handler: handleLogin },
  '/api/logout': { methods: ['POST'], handler: handleLogout },
  '/api/me': { methods: ['GET'], handler: handleMe },
  '/api/sessions': { methods: ['GET'], handler: handleSessions },
  '/api/password': { methods: ['POST', 'PUT'], handler: handlePasswordChange },
  '/api/health': { methods: ['GET'], handler: handleHealth },
  '/api/users': {
    methods: ['GET'],
    handler: (req, res) => sendJson(res, 200, { count: store.size, users: store.list() }),
  },
};

function createServer() {
  return http.createServer((req, res) => {
    const startedAt = process.hrtime.bigint();
    res.on('finish', () => logRequest(req, res, startedAt));

    let pathname;
    try {
      ({ pathname } = new URL(req.url, `http://${req.headers.host || 'localhost'}`));
    } catch (err) {
      sendJson(res, 400, { error: 'Malformed request URL.' });
      return;
    }

    const route = ROUTES[pathname];
    if (route) {
      if (!route.methods.includes(req.method)) {
        res.setHeader('Allow', route.methods.join(', '));
        sendJson(res, 405, {
          error: `Method not allowed. Use ${route.methods.join(' or ')}.`,
        });
        return;
      }

      Promise.resolve()
        .then(() => route.handler(req, res))
        .catch((err) => {
          if (res.headersSent) return;
          sendJson(res, 500, { error: 'Internal server error.' });
          if (!QUIET) console.error('Unhandled route error:', err);
        });
      return;
    }

    // Any other /api/* path is a JSON 404, not an HTML page.
    if (pathname.startsWith('/api/')) {
      sendJson(res, 404, { error: `Unknown endpoint: ${pathname}` });
      return;
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('405 Method Not Allowed');
      return;
    }

    serveStatic(req, res, pathname);
  });
}

function start(port = DEFAULT_PORT) {
  const server = createServer();

  // Purge expired sessions and stale rate-limit keys every 5 minutes.
  const sweeper = setInterval(() => {
    sessions.sweep();
    loginLimiter.sweep();
  }, 5 * 60 * 1000);
  sweeper.unref();

  server.on('close', () => clearInterval(sweeper));

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

module.exports = { createServer, start, store, sessions, loginLimiter };
