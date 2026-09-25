'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { createRouter, parseRouteKey } = require('../src/router');

function fakeRes() {
  return {
    statusCode: 0,
    headers: null,
    body: '',
    writableEnded: false,
    writeHead(status, headers) {
      this.statusCode = status;
      this.headers = headers;
      return this;
    },
    end(chunk) {
      if (chunk) this.body = String(chunk);
      this.writableEnded = true;
    },
  };
}

const ctxFor = (method, pathname) => ({ method, pathname, res: fakeRes() });

/* ---------------- parseRouteKey ---------------- */

test('parseRouteKey splits a method and path', () => {
  assert.deepEqual(parseRouteKey('GET /api/me'), { methods: ['GET'], path: '/api/me' });
});

test('parseRouteKey supports multiple methods', () => {
  assert.deepEqual(parseRouteKey('POST|PUT /api/password'), {
    methods: ['POST', 'PUT'],
    path: '/api/password',
  });
});

test('parseRouteKey uppercases methods', () => {
  assert.deepEqual(parseRouteKey('get /x').methods, ['GET']);
});

test('parseRouteKey rejects malformed keys', () => {
  for (const key of ['GET', '/api/me', 'GET api/me', ' /api/me', '']) {
    assert.throws(() => parseRouteKey(key), /Invalid route key/, `"${key}" should be rejected`);
  }
});

/* ---------------- Matching ---------------- */

test('the router dispatches an exact method and path match', () => {
  let hit = false;
  const router = createRouter({ 'GET /api/me': () => (hit = true) });

  router(ctxFor('GET', '/api/me'), () => {});
  assert.equal(hit, true);
});

test('a handler receives the context', () => {
  let received = null;
  const router = createRouter({ 'GET /x': (ctx) => (received = ctx) });
  const ctx = ctxFor('GET', '/x');

  router(ctx, () => {});
  assert.equal(received, ctx);
});

test('multi-method routes share one handler', () => {
  let calls = 0;
  const router = createRouter({ 'POST|PUT /api/password': () => (calls += 1) });

  router(ctxFor('POST', '/api/password'), () => {});
  router(ctxFor('PUT', '/api/password'), () => {});
  assert.equal(calls, 2);
});

test('HEAD falls back to the GET handler', () => {
  let hit = false;
  const router = createRouter({ 'GET /page': () => (hit = true) });

  router(ctxFor('HEAD', '/page'), () => {});
  assert.equal(hit, true, 'HEAD must reuse GET so headers match');
});

test('an explicit HEAD route wins over the GET fallback', () => {
  const calls = [];
  const router = createRouter({
    'GET /page': () => calls.push('get'),
    'HEAD /page': () => calls.push('head'),
  });

  router(ctxFor('HEAD', '/page'), () => {});
  assert.deepEqual(calls, ['head']);
});

/* ---------------- 405 handling ---------------- */

test('a known path with an unknown method returns 405 and Allow', () => {
  const router = createRouter({ 'GET /api/health': () => {} });
  const ctx = ctxFor('POST', '/api/health');

  router(ctx, () => {});

  assert.equal(ctx.res.statusCode, 405);
  assert.equal(ctx.res.headers.Allow, 'GET');
  assert.match(JSON.parse(ctx.res.body).error, /Method not allowed/);
});

test('the Allow header lists every method for the path, sorted', () => {
  const router = createRouter({ 'POST|PUT /api/password': () => {} });
  const ctx = ctxFor('DELETE', '/api/password');

  router(ctx, () => {});
  assert.equal(ctx.res.headers.Allow, 'POST, PUT');
});

test('a 405 does not fall through to the next middleware', () => {
  let nexted = false;
  const router = createRouter({ 'GET /x': () => {} });

  router(ctxFor('DELETE', '/x'), () => (nexted = true));
  assert.equal(nexted, false);
});

/* ---------------- Fallthrough and 404s ---------------- */

test('unknown API paths get a JSON 404 rather than falling through', () => {
  let nexted = false;
  const router = createRouter({ 'GET /api/me': () => {} });
  const ctx = ctxFor('GET', '/api/ghost');

  router(ctx, () => (nexted = true));

  assert.equal(nexted, false, 'API 404s must not reach the static handler');
  assert.equal(ctx.res.statusCode, 404);
  assert.match(JSON.parse(ctx.res.body).error, /Unknown endpoint/);
});

test('non-API paths fall through so static files can be served', () => {
  let nexted = false;
  const router = createRouter({ 'GET /api/me': () => {} });

  router(ctxFor('GET', '/about.html'), () => (nexted = true));
  assert.equal(nexted, true);
});

test('the API prefix is configurable', () => {
  const router = createRouter({ 'GET /v2/me': () => {} }, { prefix: '/v2/' });
  const ctx = ctxFor('GET', '/v2/ghost');

  router(ctx, () => {});
  assert.equal(ctx.res.statusCode, 404);
});

test('an empty prefix makes everything fall through', () => {
  let nexted = false;
  const router = createRouter({ 'GET /x': () => {} }, { prefix: '' });

  router(ctxFor('GET', '/api/ghost'), () => (nexted = true));
  assert.equal(nexted, true);
});

test('paths are matched exactly, not by prefix', () => {
  let nexted = false;
  const router = createRouter({ 'GET /api/user': () => {} });

  router(ctxFor('GET', '/api/users'), () => (nexted = true));
  assert.equal(nexted, false, '/api/users is still an API path, so it 404s');
});

/* ---------------- Construction guards ---------------- */

test('duplicate routes are rejected at build time', () => {
  assert.throws(
    () => createRouter({ 'GET /x': () => {}, 'GET|POST /x': () => {} }),
    /Duplicate route: GET \/x/
  );
});

test('non-function handlers are rejected', () => {
  assert.throws(() => createRouter({ 'GET /x': 'nope' }), /must map to a function/);
});

test('invalid route keys are rejected at build time', () => {
  assert.throws(() => createRouter({ 'nonsense': () => {} }), /Invalid route key/);
});

test('router.list enumerates the API surface', () => {
  const router = createRouter({
    'GET /api/me': () => {},
    'POST|PUT /api/password': () => {},
  });

  assert.deepEqual(router.list(), ['GET /api/me', 'POST /api/password', 'PUT /api/password']);
});
