'use strict';

process.env.NODE_ENV = 'test'; // silences the request log

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const { createServer, store, sessions, loginLimiter } = require('../src/server');

/* ------------------------------------------------------------------ */
/* Test harness                                                        */
/* ------------------------------------------------------------------ */

let server;
let baseUrl;

test.before(async () => {
  server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test.beforeEach(() => {
  // Each test starts from a clean auth state, but keeps the seeded users.
  sessions.clear();
  loginLimiter.clear();
});

/**
 * Minimal request helper: returns `{ status, headers, body, cookie }`.
 * `cookie` is the session token cookie pair, ready to send back.
 */
function request(method, path, { body, cookie } = {}) {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? null : JSON.stringify(body);
    const headers = {};
    if (payload) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(payload);
    }
    if (cookie) headers.Cookie = cookie;

    const req = http.request(`${baseUrl}${path}`, { method, headers }, (res) => {
      let raw = '';
      res.on('data', (chunk) => {
        raw += chunk;
      });
      res.on('end', () => {
        let parsed = raw;
        try {
          parsed = raw ? JSON.parse(raw) : null;
        } catch (err) {
          /* non-JSON responses (static files) are returned as text */
        }
        const setCookie = res.headers['set-cookie'] || [];
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: parsed,
          setCookie,
          cookie: setCookie.map((value) => value.split(';')[0]).join('; '),
        });
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

let emailCounter = 0;
/** Unique email per call, since the store persists across tests. */
function uniqueEmail() {
  emailCounter += 1;
  return `user${emailCounter}.${process.pid}@example.com`;
}

/** Sign up a fresh user and return `{ email, password, user, cookie }`. */
async function signUp(overrides = {}) {
  const email = overrides.email || uniqueEmail();
  const password = overrides.password || 'analytical1';
  const res = await request('POST', '/api/signup', {
    body: { name: 'Test User', email, password, ...overrides },
  });

  assert.equal(res.status, 201, `signup failed: ${JSON.stringify(res.body)}`);
  return { email, password, user: res.body.user, cookie: res.cookie };
}

/* ------------------------------------------------------------------ */
/* Health                                                             */
/* ------------------------------------------------------------------ */

test('GET /api/health reports status and counters', async () => {
  const res = await request('GET', '/api/health');

  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'ok');
  assert.equal(typeof res.body.uptimeSeconds, 'number');
  assert.ok(res.body.uptimeSeconds >= 0);
  assert.equal(res.body.users, store.size);
  assert.equal(res.body.node, process.version);
  assert.match(res.body.startedAt, /^\d{4}-\d{2}-\d{2}T/);
});

test('POST /api/health is rejected with an Allow header', async () => {
  const res = await request('POST', '/api/health', { body: {} });

  assert.equal(res.status, 405);
  assert.equal(res.headers.allow, 'GET');
  assert.match(res.body.error, /Method not allowed/);
});

/* ------------------------------------------------------------------ */
/* Signup / login session issuing                                      */
/* ------------------------------------------------------------------ */

test('signup logs the new user in with a hardened cookie', async () => {
  const res = await request('POST', '/api/signup', {
    body: { name: 'Grace Hopper', email: uniqueEmail(), password: 'compiler1' },
  });

  assert.equal(res.status, 201);
  const cookie = res.setCookie[0];
  assert.match(cookie, /^sid=[0-9a-f]{64};/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Lax/);
  assert.equal(res.body.user.passwordHash, undefined);
});

test('login returns a session cookie and the public user', async () => {
  const { email, password } = await signUp();
  const res = await request('POST', '/api/login', { body: { email, password } });

  assert.equal(res.status, 200);
  assert.match(res.cookie, /^sid=[0-9a-f]{64}$/);
  assert.equal(res.body.user.email, email);
  assert.equal(res.body.user.passwordHash, undefined);
});

test('login with bad credentials sets no cookie', async () => {
  const { email } = await signUp();
  const res = await request('POST', '/api/login', { body: { email, password: 'wrong12345' } });

  assert.equal(res.status, 401);
  assert.equal(res.setCookie.length, 0);
  assert.equal(res.body.error, 'Incorrect email or password.');
});

test('login rejects a malformed JSON body', async () => {
  const res = await new Promise((resolve, reject) => {
    const req = http.request(
      `${baseUrl}/api/login`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' } },
      (response) => {
        let raw = '';
        response.on('data', (c) => {
          raw += c;
        });
        response.on('end', () => resolve({ status: response.statusCode, body: JSON.parse(raw) }));
      }
    );
    req.on('error', reject);
    req.end('{not json');
  });

  assert.equal(res.status, 400);
  assert.match(res.body.error, /Invalid JSON/);
});

/* ------------------------------------------------------------------ */
/* /api/me                                                             */
/* ------------------------------------------------------------------ */

test('GET /api/me returns the logged-in user and session info', async () => {
  const { email, cookie } = await signUp();
  const res = await request('GET', '/api/me', { cookie });

  assert.equal(res.status, 200);
  assert.equal(res.body.user.email, email);
  assert.match(res.body.session.createdAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.match(res.body.session.expiresAt, /^\d{4}-\d{2}-\d{2}T/);
});

test('GET /api/me without a cookie is a 401', async () => {
  const res = await request('GET', '/api/me');

  assert.equal(res.status, 401);
  assert.match(res.body.error, /Authentication required/);
});

test('GET /api/me with a forged token is a 401 and clears the cookie', async () => {
  const res = await request('GET', '/api/me', { cookie: `sid=${'0'.repeat(64)}` });

  assert.equal(res.status, 401);
  assert.match(res.setCookie[0], /Max-Age=0/);
});

test('GET /api/me fails after the user is removed from the store', async () => {
  const { user, cookie } = await signUp();
  store.remove(user.id);

  const res = await request('GET', '/api/me', { cookie });
  assert.equal(res.status, 401);
});

/* ------------------------------------------------------------------ */
/* /api/logout                                                         */
/* ------------------------------------------------------------------ */

test('POST /api/logout destroys the session and clears the cookie', async () => {
  const { cookie } = await signUp();

  const res = await request('POST', '/api/logout', { cookie });
  assert.equal(res.status, 200);
  assert.equal(res.body.destroyed, true);
  assert.match(res.setCookie[0], /Max-Age=0/);

  const after = await request('GET', '/api/me', { cookie });
  assert.equal(after.status, 401, 'the old cookie must no longer work');
});

test('POST /api/logout without a session still succeeds', async () => {
  const res = await request('POST', '/api/logout');

  assert.equal(res.status, 200);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.destroyed, false);
});

test('logging out one device leaves the other logged in', async () => {
  const { email, password } = await signUp();
  const first = await request('POST', '/api/login', { body: { email, password } });
  const second = await request('POST', '/api/login', { body: { email, password } });

  await request('POST', '/api/logout', { cookie: first.cookie });

  assert.equal((await request('GET', '/api/me', { cookie: first.cookie })).status, 401);
  assert.equal((await request('GET', '/api/me', { cookie: second.cookie })).status, 200);
});

/* ------------------------------------------------------------------ */
/* /api/sessions                                                       */
/* ------------------------------------------------------------------ */

test('GET /api/sessions lists the active devices for the caller', async () => {
  const { email, password } = await signUp();
  await request('POST', '/api/login', { body: { email, password } });
  const second = await request('POST', '/api/login', { body: { email, password } });

  const res = await request('GET', '/api/sessions', { cookie: second.cookie });

  assert.equal(res.status, 200);
  assert.equal(res.body.count, 3, 'signup + two logins');
  assert.equal(res.body.sessions.length, 3);
  assert.equal(res.body.sessions[0].userAgent, '');
  assert.equal(Object.hasOwn(res.body.sessions[0], 'token'), false, 'tokens must never leak');
});

test('GET /api/sessions requires a session', async () => {
  assert.equal((await request('GET', '/api/sessions')).status, 401);
});

/* ------------------------------------------------------------------ */
/* /api/password                                                       */
/* ------------------------------------------------------------------ */

test('POST /api/password changes the password and revokes other sessions', async () => {
  const { email, password } = await signUp();
  const stale = await request('POST', '/api/login', { body: { email, password } });
  const current = await request('POST', '/api/login', { body: { email, password } });

  const res = await request('POST', '/api/password', {
    cookie: current.cookie,
    body: { currentPassword: password, newPassword: 'rotated9876' },
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.user.email, email);
  assert.equal(res.body.revokedSessions, 2, 'signup session + the stale login');

  assert.equal((await request('GET', '/api/me', { cookie: current.cookie })).status, 200);
  assert.equal((await request('GET', '/api/me', { cookie: stale.cookie })).status, 401);

  // The new password works and the old one does not.
  assert.equal(
    (await request('POST', '/api/login', { body: { email, password: 'rotated9876' } })).status,
    200
  );
  assert.equal((await request('POST', '/api/login', { body: { email, password } })).status, 401);
});

test('POST /api/password rejects a wrong current password', async () => {
  const { cookie } = await signUp();
  const res = await request('POST', '/api/password', {
    cookie,
    body: { currentPassword: 'nope12345', newPassword: 'rotated9876' },
  });

  assert.equal(res.status, 401);
  assert.equal(res.body.field, 'currentPassword');
});

test('POST /api/password requires the current password field', async () => {
  const { cookie } = await signUp();
  const res = await request('POST', '/api/password', {
    cookie,
    body: { newPassword: 'rotated9876' },
  });

  assert.equal(res.status, 400);
  assert.equal(res.body.field, 'currentPassword');
});

test('POST /api/password enforces strength on the new password', async () => {
  const { cookie, password } = await signUp();
  const res = await request('POST', '/api/password', {
    cookie,
    body: { currentPassword: password, newPassword: 'weak' },
  });

  assert.equal(res.status, 400);
  assert.equal(res.body.field, 'newPassword');
  assert.match(res.body.error, /at least 8/);
});

test('POST /api/password refuses to reuse the current password', async () => {
  const { cookie, password } = await signUp();
  const res = await request('POST', '/api/password', {
    cookie,
    body: { currentPassword: password, newPassword: password },
  });

  assert.equal(res.status, 400);
  assert.match(res.body.error, /different from the current one/);
});

test('POST /api/password requires authentication', async () => {
  const res = await request('POST', '/api/password', {
    body: { currentPassword: 'analytical1', newPassword: 'rotated9876' },
  });

  assert.equal(res.status, 401);
});

test('PUT /api/password is accepted as an alias', async () => {
  const { cookie, password } = await signUp();
  const res = await request('PUT', '/api/password', {
    cookie,
    body: { currentPassword: password, newPassword: 'aliased1234' },
  });

  assert.equal(res.status, 200);
});

/* ------------------------------------------------------------------ */
/* Rate limiting                                                       */
/* ------------------------------------------------------------------ */

test('repeated failed logins are throttled with a 429 and Retry-After', async () => {
  const { email } = await signUp();
  const bad = { email, password: 'wrong12345' };

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const res = await request('POST', '/api/login', { body: bad });
    assert.equal(res.status, 401, `attempt ${attempt} should still be a 401`);
    assert.equal(res.body.attemptsRemaining, 5 - attempt);
  }

  const blocked = await request('POST', '/api/login', { body: bad });
  assert.equal(blocked.status, 429);
  assert.match(blocked.body.error, /Too many failed attempts/);
  assert.ok(Number(blocked.headers['retry-after']) > 0);
});

test('a throttled key blocks even the correct password', async () => {
  const { email, password } = await signUp();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    await request('POST', '/api/login', { body: { email, password: 'wrong12345' } });
  }

  const res = await request('POST', '/api/login', { body: { email, password } });
  assert.equal(res.status, 429);
});

test('a successful login resets the failure counter', async () => {
  const { email, password } = await signUp();

  await request('POST', '/api/login', { body: { email, password: 'wrong12345' } });
  await request('POST', '/api/login', { body: { email, password: 'wrong12345' } });
  assert.equal((await request('POST', '/api/login', { body: { email, password } })).status, 200);

  const res = await request('POST', '/api/login', { body: { email, password: 'wrong12345' } });
  assert.equal(res.body.attemptsRemaining, 4, 'the counter restarted from zero');
});

test('throttling one account does not affect another', async () => {
  const victim = await signUp();
  const bystander = await signUp();

  for (let attempt = 0; attempt < 6; attempt += 1) {
    await request('POST', '/api/login', { body: { email: victim.email, password: 'wrong12345' } });
  }

  const res = await request('POST', '/api/login', {
    body: { email: bystander.email, password: bystander.password },
  });
  assert.equal(res.status, 200);
});

/* ------------------------------------------------------------------ */
/* Routing                                                             */
/* ------------------------------------------------------------------ */

test('unknown /api/* paths return JSON 404s', async () => {
  const res = await request('GET', '/api/does-not-exist');

  assert.equal(res.status, 404);
  assert.match(res.headers['content-type'], /application\/json/);
  assert.match(res.body.error, /Unknown endpoint/);
});

test('GET /api/users still returns the store contents without hashes', async () => {
  const res = await request('GET', '/api/users');

  assert.equal(res.status, 200);
  assert.equal(res.body.count, store.size);
  assert.ok(Array.isArray(res.body.users));
  assert.equal(JSON.stringify(res.body).includes('scrypt$'), false);
});

test('the landing page is still served for non-API paths', async () => {
  const res = await request('GET', '/');

  assert.equal(res.status, 200);
  assert.match(res.headers['content-type'], /text\/html/);
});

test('path traversal attempts do not escape public/', async () => {
  const res = await request('GET', '/../package.json');

  assert.ok(res.status === 403 || res.status === 404, `unexpected status ${res.status}`);
  assert.equal(String(res.body).includes('githubtest-dummy-project'), false);
});
