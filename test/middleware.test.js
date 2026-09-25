'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  compose,
  createContext,
  requestLogger,
  errorHandler,
  notFoundHandler,
} = require('../src/middleware');
const { HttpError, badRequest } = require('../src/http');

function fakeRes() {
  const listeners = {};
  return {
    statusCode: 0,
    headers: null,
    body: '',
    headersSent: false,
    writableEnded: false,
    writeHead(status, headers) {
      this.statusCode = status;
      this.headers = headers;
      this.headersSent = true;
      return this;
    },
    end(chunk) {
      if (chunk) this.body = String(chunk);
      this.writableEnded = true;
      (listeners.finish || []).forEach((fn) => fn());
    },
    on(event, fn) {
      (listeners[event] ||= []).push(fn);
      return this;
    },
  };
}

function fakeReq(url = '/', headers = {}, method = 'GET') {
  return { url, method, headers: { host: 'localhost', ...headers } };
}

/* ---------------- compose ---------------- */

test('compose runs middleware in order, then the final handler', async () => {
  const order = [];
  const run = compose([
    async (ctx, next) => {
      order.push('a-before');
      await next();
      order.push('a-after');
    },
    async (ctx, next) => {
      order.push('b-before');
      await next();
      order.push('b-after');
    },
  ]);

  await run({}, () => order.push('handler'));

  assert.deepEqual(order, ['a-before', 'b-before', 'handler', 'b-after', 'a-after']);
});

test('compose stops when a middleware does not call next', async () => {
  const order = [];
  const run = compose([
    () => {
      order.push('short-circuit');
    },
    () => order.push('never'),
  ]);

  await run({}, () => order.push('handler'));
  assert.deepEqual(order, ['short-circuit']);
});

test('compose rejects when next() is called twice', async () => {
  const run = compose([
    async (ctx, next) => {
      await next();
      await next();
    },
  ]);

  await assert.rejects(() => run({}, () => {}), /next\(\) called multiple times/);
});

test('compose propagates both thrown and rejected errors', async () => {
  const thrown = compose([
    () => {
      throw new Error('sync boom');
    },
  ]);
  await assert.rejects(() => thrown({}, () => {}), /sync boom/);

  const rejected = compose([async () => Promise.reject(new Error('async boom'))]);
  await assert.rejects(() => rejected({}, () => {}), /async boom/);
});

test('compose ignores falsy entries so middleware can be toggled', async () => {
  const order = [];
  const run = compose([null, (ctx, next) => next(), false, undefined]);

  await run({}, () => order.push('handler'));
  assert.deepEqual(order, ['handler']);
});

test('compose with no middleware still runs the final handler', async () => {
  let called = false;
  await compose([])({}, () => {
    called = true;
  });
  assert.equal(called, true);
});

/* ---------------- createContext ---------------- */

test('createContext parses the pathname and query', () => {
  const ctx = createContext(fakeReq('/api/users?role=admin&page=2'), fakeRes(), {});

  assert.equal(ctx.pathname, '/api/users');
  assert.equal(ctx.query.get('role'), 'admin');
  assert.equal(ctx.query.get('page'), '2');
  assert.equal(ctx.method, 'GET');
  assert.equal(ctx.auth, null);
});

test('createContext injects dependencies onto the context', () => {
  const users = { marker: 'store' };
  const ctx = createContext(fakeReq('/'), fakeRes(), { users, config: { quiet: true } });

  assert.equal(ctx.users, users);
  assert.equal(ctx.config.quiet, true);
});

test('createContext survives a malformed URL', () => {
  const ctx = createContext(fakeReq('http://['), fakeRes(), {});

  assert.equal(ctx.pathname, '/');
  assert.equal([...ctx.query].length, 0);
});

/* ---------------- errorHandler ---------------- */

test('errorHandler turns an HttpError into its intended response', async () => {
  const res = fakeRes();
  const run = compose([
    errorHandler({ quiet: true }),
    () => {
      throw badRequest('Bad email.', 'email');
    },
  ]);

  await run({ res }, () => {});

  assert.equal(res.statusCode, 400);
  assert.deepEqual(JSON.parse(res.body), { error: 'Bad email.', field: 'email' });
});

test('errorHandler applies the extra headers from an HttpError', async () => {
  const res = fakeRes();
  const run = compose([
    errorHandler({ quiet: true }),
    () => {
      throw new HttpError(429, 'Slow down', { headers: { 'Retry-After': '42' } });
    },
  ]);

  await run({ res }, () => {});
  assert.equal(res.headers['Retry-After'], '42');
});

test('errorHandler hides unexpected errors behind a generic 500', async () => {
  const res = fakeRes();
  const logged = [];
  const run = compose([
    errorHandler({ logError: (...args) => logged.push(args) }),
    () => {
      throw new Error('database password leaked in this message');
    },
  ]);

  await run({ res }, () => {});

  assert.equal(res.statusCode, 500);
  assert.deepEqual(JSON.parse(res.body), { error: 'Internal server error.' });
  assert.equal(res.body.includes('password'), false, 'internals must not leak');
  assert.equal(logged.length, 1, 'but it must still be logged server-side');
});

test('errorHandler does not double-send when the response already went out', async () => {
  const res = fakeRes();
  const run = compose([
    errorHandler({ quiet: true }),
    (ctx) => {
      ctx.res.writeHead(200, {});
      ctx.res.end('{"ok":true}');
      throw new Error('too late');
    },
  ]);

  await run({ res }, () => {});

  assert.equal(res.statusCode, 200);
  assert.deepEqual(JSON.parse(res.body), { ok: true });
});

test('errorHandler passes through when nothing throws', async () => {
  const res = fakeRes();
  const run = compose([errorHandler({ quiet: true }), (ctx) => ctx.res.writeHead(204, {})]);

  await run({ res }, () => {});
  assert.equal(res.statusCode, 204);
});

/* ---------------- requestLogger ---------------- */

test('requestLogger writes one line per finished response', async () => {
  const lines = [];
  const res = fakeRes();
  const ctx = { req: fakeReq('/api/me'), res, method: 'GET' };

  await compose([requestLogger({ log: (line) => lines.push(line) })])(ctx, () => {
    res.writeHead(200, {});
    res.end('{}');
  });

  assert.equal(lines.length, 1);
  assert.match(lines[0], /GET \/api\/me 200 \d+\.\d+ms/);
});

test('requestLogger logs the final status, not an intermediate one', async () => {
  const lines = [];
  const res = fakeRes();
  const ctx = { req: fakeReq('/api/nope'), res, method: 'GET' };

  await compose([
    requestLogger({ log: (line) => lines.push(line) }),
    errorHandler({ quiet: true }),
    () => {
      throw badRequest('nope');
    },
  ])(ctx, () => {});

  assert.match(lines[0], / 400 /);
});

test('requestLogger stays silent when quiet', async () => {
  const lines = [];
  const res = fakeRes();

  await compose([requestLogger({ quiet: true, log: (l) => lines.push(l) })])(
    { req: fakeReq('/'), res, method: 'GET' },
    () => {
      res.writeHead(200, {});
      res.end('ok');
    }
  );

  assert.equal(lines.length, 0);
});

/* ---------------- notFoundHandler ---------------- */

test('notFoundHandler answers with a JSON 404', () => {
  const res = fakeRes();
  notFoundHandler()({ res, pathname: '/ghost' });

  assert.equal(res.statusCode, 404);
  assert.match(JSON.parse(res.body).error, /Not found: \/ghost/);
});

test('notFoundHandler does nothing if a response was already sent', () => {
  const res = fakeRes();
  res.writeHead(200, {});
  res.end('done');

  notFoundHandler()({ res, pathname: '/ghost' });
  assert.equal(res.statusCode, 200);
});
