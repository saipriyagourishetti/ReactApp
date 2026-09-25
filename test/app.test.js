'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const { createApp } = require('../src/app');
const { UserStore } = require('../src/userStore');

/**
 * Tests for the composition root.
 *
 * Unlike test/server.test.js (which exercises the shared singleton stores),
 * every case here builds a fully isolated app — which is the main benefit the
 * refactor bought us.
 */

/** Start an isolated app on an ephemeral port. */
async function startApp(options = {}) {
  // Spread `options` first so its own `config` cannot clobber the merged one.
  const { config: configOverrides, ...rest } = options;
  const app = createApp({
    ...rest,
    config: { quiet: true, seedUsers: [], ...(configOverrides || {}) },
  });

  await new Promise((resolve) => app.server.listen(0, '127.0.0.1', resolve));
  const baseUrl = `http://127.0.0.1:${app.server.address().port}`;

  return {
    ...app,
    baseUrl,
    close: () => new Promise((resolve) => app.server.close(resolve)),
    request: (method, path, opts) => request(baseUrl, method, path, opts),
  };
}

function request(baseUrl, method, path, { body, cookie } = {}) {
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
          /* static responses stay as text */
        }
        const setCookie = res.headers['set-cookie'] || [];
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: parsed,
          cookie: setCookie.map((v) => v.split(';')[0]).join('; '),
        });
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

/* ---------------- Isolation ---------------- */

test('createApp builds an app with its own stores', async () => {
  const app = await startApp();
  try {
    const res = await app.request('GET', '/api/users');
    assert.equal(res.status, 200);
    assert.equal(res.body.count, 0, 'seedUsers was overridden to empty');
  } finally {
    await app.close();
  }
});

test('two apps do not share state', async () => {
  const first = await startApp();
  const second = await startApp();

  try {
    await first.request('POST', '/api/signup', {
      body: { name: 'Ada', email: 'ada@example.com', password: 'analytical1' },
    });

    assert.equal((await first.request('GET', '/api/users')).body.count, 1);
    assert.equal(
      (await second.request('GET', '/api/users')).body.count,
      0,
      'the second app must be unaffected'
    );
  } finally {
    await first.close();
    await second.close();
  }
});

test('an injected store is used as-is', async () => {
  const users = new UserStore([{ name: 'Alan', email: 'alan@example.com' }]);
  const app = await startApp({ users });

  try {
    const res = await app.request('GET', '/api/users');
    assert.equal(res.body.count, 1);
    assert.equal(res.body.users[0].email, 'alan@example.com');
  } finally {
    await app.close();
  }
});

test('config overrides reach the running app', async () => {
  const app = await startApp({ config: { loginLimit: 2 } });

  try {
    const users = app.users;
    users.create({ name: 'Ada', email: 'ada@example.com', password: 'analytical1' });

    const bad = { email: 'ada@example.com', password: 'wrong12345' };
    assert.equal((await app.request('POST', '/api/login', { body: bad })).status, 401);
    assert.equal((await app.request('POST', '/api/login', { body: bad })).status, 401);

    const blocked = await app.request('POST', '/api/login', { body: bad });
    assert.equal(blocked.status, 429, 'the lower limit of 2 should now apply');
  } finally {
    await app.close();
  }
});

test('a short session TTL expires the cookie', async () => {
  const app = await startApp({ config: { sessionTtlMs: 40 } });

  try {
    const signup = await app.request('POST', '/api/signup', {
      body: { name: 'Ada', email: 'ada@example.com', password: 'analytical1' },
    });
    assert.equal((await app.request('GET', '/api/me', { cookie: signup.cookie })).status, 200);

    await new Promise((resolve) => setTimeout(resolve, 60));

    const expired = await app.request('GET', '/api/me', { cookie: signup.cookie });
    assert.equal(expired.status, 401, 'the session should have timed out');
  } finally {
    await app.close();
  }
});

test('COOKIE_SECURE adds Secure to the session cookie', async () => {
  const app = await startApp({ config: { cookieSecure: true } });

  try {
    const res = await app.request('POST', '/api/signup', {
      body: { name: 'Ada', email: 'ada@example.com', password: 'analytical1' },
    });
    const raw = res.headers['set-cookie'][0];

    assert.match(raw, /Secure/);
    assert.match(raw, /HttpOnly/);
  } finally {
    await app.close();
  }
});

/* ---------------- Route surface ---------------- */

test('the router exposes the full API surface', async () => {
  const app = await startApp();
  try {
    assert.deepEqual(app.router.list(), [
      'GET /api/calc/percentage',
      'GET /api/calc/sqrt',
      'GET /api/health',
      'GET /api/me',
      'GET /api/sessions',
      'GET /api/users',
      'POST /api/login',
      'POST /api/logout',
      'POST /api/password',
      'POST /api/signup',
      'PUT /api/password',
    ]);
  } finally {
    await app.close();
  }
});

/* ---------------- ?role= filtering ---------------- */

test('GET /api/users filters by role', async () => {
  const users = new UserStore([
    { name: 'Ada', email: 'ada@example.com', role: 'admin' },
    { name: 'Alan', email: 'alan@example.com', role: 'user' },
    { name: 'Grace', email: 'grace@example.com', role: 'admin' },
  ]);
  const app = await startApp({ users });

  try {
    const admins = await app.request('GET', '/api/users?role=admin');
    assert.equal(admins.status, 200);
    assert.equal(admins.body.count, 2);
    assert.deepEqual(
      admins.body.users.map((u) => u.name).sort(),
      ['Ada', 'Grace']
    );

    const regular = await app.request('GET', '/api/users?role=user');
    assert.equal(regular.body.count, 1);
  } finally {
    await app.close();
  }
});

test('an empty role parameter returns everyone', async () => {
  const users = new UserStore([{ name: 'Ada', email: 'ada@example.com', role: 'admin' }]);
  const app = await startApp({ users });

  try {
    assert.equal((await app.request('GET', '/api/users?role=')).body.count, 1);
  } finally {
    await app.close();
  }
});

test('an unknown role is a 400 rather than an empty list', async () => {
  const app = await startApp();

  try {
    const res = await app.request('GET', '/api/users?role=wizard');

    assert.equal(res.status, 400);
    assert.equal(res.body.field, 'role');
    assert.match(res.body.error, /Unknown role "wizard"/);
  } finally {
    await app.close();
  }
});

/* ---------------- Error handling ---------------- */

test('an oversized body is rejected with a 413', async () => {
  const app = await startApp({ config: { maxBodyBytes: 100 } });

  try {
    const res = await app.request('POST', '/api/signup', {
      body: { name: 'x'.repeat(500), email: 'ada@example.com', password: 'analytical1' },
    });
    assert.equal(res.status, 413);
  } finally {
    await app.close();
  }
});

test('a handler that throws unexpectedly yields a generic 500', async () => {
  // A store whose method explodes simulates an internal bug.
  const users = new UserStore([]);
  users.list = () => {
    throw new Error('simulated internal failure with secrets');
  };
  const app = await startApp({ users });

  try {
    const res = await app.request('GET', '/api/users');

    assert.equal(res.status, 500);
    assert.deepEqual(res.body, { error: 'Internal server error.' });
    assert.equal(JSON.stringify(res.body).includes('secrets'), false);
  } finally {
    await app.close();
  }
});

test('closing the server clears the sweep interval', async () => {
  const app = await startApp();
  await app.close();

  // If the interval were still pending and not unref'd, the test runner would
  // hang here rather than exiting cleanly.
  assert.equal(app.server.listening, false);
});
