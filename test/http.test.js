'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { Readable } = require('node:stream');

const {
  HttpError,
  badRequest,
  unauthorized,
  notFound,
  conflict,
  sendJson,
  sendText,
  sendHtml,
  readBody,
  readJson,
  clientIp,
  stringField,
  rawField,
} = require('../src/http');

/**
 * Minimal ServerResponse double: records what a handler wrote without
 * needing a real socket.
 */
function fakeRes() {
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
    },
  };
}

/** Minimal IncomingMessage double backed by a readable stream. */
function fakeReq(body = '', headers = {}) {
  const req = Readable.from([Buffer.from(body)]);
  req.headers = headers;
  req.socket = { remoteAddress: '203.0.113.7' };
  return req;
}

/* ---------------- HttpError ---------------- */

test('HttpError carries a status and serialises to a body', () => {
  const err = new HttpError(418, 'I am a teapot');

  assert.ok(err instanceof Error);
  assert.equal(err.name, 'HttpError');
  assert.equal(err.status, 418);
  assert.deepEqual(err.toBody(), { error: 'I am a teapot' });
});

test('HttpError includes the field hint only when present', () => {
  assert.deepEqual(new HttpError(400, 'Bad', { field: 'email' }).toBody(), {
    error: 'Bad',
    field: 'email',
  });
  assert.equal(Object.hasOwn(new HttpError(400, 'Bad').toBody(), 'field'), false);
});

test('the error factories set the expected statuses', () => {
  assert.equal(badRequest('x').status, 400);
  assert.equal(unauthorized('x').status, 401);
  assert.equal(notFound('x').status, 404);
  assert.equal(conflict('x').status, 409);

  assert.equal(badRequest('x', 'name').field, 'name');
  assert.equal(conflict('x', 'email').field, 'email');
});

test('HttpError can carry extra response headers', () => {
  const err = new HttpError(429, 'Slow down', { headers: { 'Retry-After': '30' } });
  assert.deepEqual(err.headers, { 'Retry-After': '30' });
});

/* ---------------- Senders ---------------- */

test('sendJson writes the status, content type and length', () => {
  const res = fakeRes();
  sendJson(res, 201, { ok: true });

  assert.equal(res.statusCode, 201);
  assert.match(res.headers['Content-Type'], /application\/json/);
  assert.equal(res.headers['Content-Length'], Buffer.byteLength('{"ok":true}'));
  assert.deepEqual(JSON.parse(res.body), { ok: true });
});

test('sendJson merges extra headers', () => {
  const res = fakeRes();
  sendJson(res, 200, {}, { 'Set-Cookie': 'sid=abc' });

  assert.equal(res.headers['Set-Cookie'], 'sid=abc');
});

test('sendText and sendHtml set their content types', () => {
  const text = fakeRes();
  sendText(text, 403, '403 Forbidden');
  assert.match(text.headers['Content-Type'], /text\/plain/);
  assert.equal(text.body, '403 Forbidden');

  const html = fakeRes();
  sendHtml(html, 404, '<h1>nope</h1>');
  assert.match(html.headers['Content-Type'], /text\/html/);
});

test('senders are no-ops once the response has ended', () => {
  const res = fakeRes();
  sendJson(res, 200, { first: true });
  sendJson(res, 500, { second: true });

  assert.equal(res.statusCode, 200, 'the second send must not overwrite the first');
  assert.deepEqual(JSON.parse(res.body), { first: true });
});

test('multi-byte bodies get a byte length, not a character count', () => {
  const res = fakeRes();
  sendJson(res, 200, { name: 'Ada — Lovelace ✓' });

  assert.equal(res.headers['Content-Length'], Buffer.byteLength(res.body));
  assert.ok(res.headers['Content-Length'] > res.body.length);
});

/* ---------------- Body reading ---------------- */

test('readBody buffers the whole request', async () => {
  assert.equal(await readBody(fakeReq('hello world')), 'hello world');
});

test('readBody rejects once the limit is exceeded', async () => {
  await assert.rejects(() => readBody(fakeReq('x'.repeat(200)), 100), /Payload too large/);
});

test('readBody rejects with a 413 HttpError', async () => {
  await assert.rejects(
    () => readBody(fakeReq('x'.repeat(50)), 10),
    (err) => err instanceof HttpError && err.status === 413
  );
});

test('readBody reassembles multi-byte characters split across chunks', async () => {
  // '✓' is three bytes; split it so a naive per-chunk toString would corrupt it.
  const bytes = Buffer.from('a✓b', 'utf8');
  const req = Readable.from([bytes.subarray(0, 2), bytes.subarray(2)]);
  req.headers = {};

  assert.equal(await readBody(req), 'a✓b');
});

test('readJson parses an object body', async () => {
  assert.deepEqual(await readJson(fakeReq('{"a":1}')), { a: 1 });
});

test('readJson treats an empty body as an empty object', async () => {
  assert.deepEqual(await readJson(fakeReq('')), {});
});

test('readJson rejects malformed JSON with a 400', async () => {
  await assert.rejects(
    () => readJson(fakeReq('{nope')),
    (err) => err.status === 400 && /Invalid JSON/.test(err.message)
  );
});

test('readJson rejects arrays and primitives', async () => {
  for (const body of ['[1,2]', '"string"', '42', 'null']) {
    await assert.rejects(
      () => readJson(fakeReq(body)),
      (err) => err.status === 400 && /must be a JSON object/.test(err.message),
      `body ${body} should be rejected`
    );
  }
});

/* ---------------- Request helpers ---------------- */

test('clientIp falls back to the socket address', () => {
  assert.equal(clientIp(fakeReq('', {})), '203.0.113.7');
});

test('clientIp prefers the first X-Forwarded-For entry', () => {
  const req = fakeReq('', { 'x-forwarded-for': '198.51.100.9, 10.0.0.1' });
  assert.equal(clientIp(req), '198.51.100.9');
});

test('clientIp survives a missing socket', () => {
  assert.equal(clientIp({ headers: {} }), 'unknown');
});

test('stringField trims, rawField does not', () => {
  const data = { name: '  Ada  ', password: '  secret1  ' };

  assert.equal(stringField(data, 'name'), 'Ada');
  assert.equal(rawField(data, 'password'), '  secret1  ');
});

test('the field helpers return empty strings for missing or non-string values', () => {
  for (const value of [undefined, null, 42, {}, []]) {
    assert.equal(stringField({ k: value }, 'k'), '');
    assert.equal(rawField({ k: value }, 'k'), '');
  }
  assert.equal(stringField(undefined, 'k'), '');
});
