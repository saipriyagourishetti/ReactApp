'use strict';

/**
 * Low-level HTTP helpers shared by every route and middleware.
 *
 * Nothing here knows about users, sessions or routing — it only deals in
 * requests, responses and bytes.
 */

/**
 * An error carrying an HTTP status, so route handlers can simply `throw`
 * instead of threading `res` through their validation branches.
 *
 * The error middleware turns this into a JSON response; `field` names the
 * offending form control, matching the shape the clients already expect.
 */
class HttpError extends Error {
  constructor(status, message, { field, headers } = {}) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.field = field;
    this.headers = headers;
  }

  /** Response body for this error, omitting absent optional keys. */
  toBody() {
    return this.field ? { error: this.message, field: this.field } : { error: this.message };
  }
}

/** 400 — the client sent something invalid. */
const badRequest = (message, field) => new HttpError(400, message, { field });
/** 401 — authentication is missing or failed. */
const unauthorized = (message, options) => new HttpError(401, message, options);
/** 404 — no such resource. */
const notFound = (message) => new HttpError(404, message);
/** 409 — conflicts with existing state, e.g. a duplicate email. */
const conflict = (message, field) => new HttpError(409, message, { field });

function sendJson(res, status, body, headers = {}) {
  if (res.writableEnded) return;
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    ...headers,
  });
  res.end(payload);
}

function sendText(res, status, body, headers = {}) {
  if (res.writableEnded) return;
  res.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    ...headers,
  });
  res.end(body);
}

function sendHtml(res, status, body, headers = {}) {
  if (res.writableEnded) return;
  res.writeHead(status, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    ...headers,
  });
  res.end(body);
}

/**
 * Buffer a request body, rejecting once it grows past `limit` bytes.
 */
function readBody(req, limit = 1e5) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];

    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new HttpError(413, 'Payload too large.'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

/**
 * Read and parse a JSON object body.
 *
 * Throws an `HttpError` for malformed JSON or non-object payloads, so callers
 * can assume they received a plain object.
 */
async function readJson(req, limit = 1e5) {
  const raw = await readBody(req, limit);

  let data;
  try {
    data = JSON.parse(raw || '{}');
  } catch (err) {
    throw badRequest('Invalid JSON payload.');
  }

  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    throw badRequest('Request body must be a JSON object.');
  }
  return data;
}

/**
 * Best-effort client IP, honouring `X-Forwarded-For` when behind a proxy.
 */
function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

/** Trimmed string field, or '' when absent/not a string. */
function stringField(source, key) {
  const value = source?.[key];
  return typeof value === 'string' ? value.trim() : '';
}

/** Raw string field — used for passwords, where whitespace is significant. */
function rawField(source, key) {
  const value = source?.[key];
  return typeof value === 'string' ? value : '';
}

module.exports = {
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
};
