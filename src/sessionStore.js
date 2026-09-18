'use strict';

const crypto = require('crypto');

/** Default session lifetime: 30 minutes of inactivity. */
const DEFAULT_TTL_MS = 30 * 60 * 1000;

/** Bytes of entropy per token (256 bits, hex encoded to 64 characters). */
const TOKEN_BYTES = 32;

/** Name of the cookie used to carry the session token. */
const SESSION_COOKIE = 'sid';

/**
 * Generate an opaque, cryptographically random session token.
 */
function createToken() {
  return crypto.randomBytes(TOKEN_BYTES).toString('hex');
}

/**
 * Hash a token so the raw value is never kept in memory.
 *
 * Tokens already carry 256 bits of entropy, so a fast single-pass digest is
 * enough here — there is nothing to brute force. This only limits the damage
 * if a heap dump ever leaks.
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

/**
 * Parse an HTTP `Cookie` header into a plain object.
 * Unknown/malformed pairs are skipped rather than throwing.
 */
function parseCookies(header) {
  const out = Object.create(null);
  if (typeof header !== 'string' || header.length === 0) return out;

  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index < 1) continue;

    const name = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (!name) continue;

    try {
      out[name] = decodeURIComponent(value);
    } catch (err) {
      out[name] = value;
    }
  }
  return out;
}

/**
 * Build a `Set-Cookie` value for a session token.
 *
 * `HttpOnly` keeps it away from JavaScript, `SameSite=Lax` blocks the obvious
 * CSRF vectors while still allowing top-level navigation, and `Path=/` makes it
 * visible to every API route.
 */
function buildSessionCookie(token, { maxAgeMs = DEFAULT_TTL_MS, secure = false } = {}) {
  const attrs = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Math.floor(maxAgeMs / 1000)}`,
  ];
  if (secure) attrs.push('Secure');
  return attrs.join('; ');
}

/**
 * Build a `Set-Cookie` value that immediately clears the session cookie.
 */
function buildClearCookie({ secure = false } = {}) {
  const attrs = [`${SESSION_COOKIE}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'];
  if (secure) attrs.push('Secure');
  return attrs.join('; ');
}

/**
 * An in-memory, sliding-expiration session store.
 *
 * Only token *hashes* are stored, keyed by hash, so a leaked store cannot be
 * replayed directly. Every session records the user id plus a little metadata
 * useful for an "active sessions" view.
 *
 * Deliberately dependency-free, like the rest of this project.
 */
class SessionStore {
  constructor({ ttlMs = DEFAULT_TTL_MS, now = () => Date.now() } = {}) {
    this.ttlMs = ttlMs;
    this.now = now;
    this.sessions = new Map();
  }

  /**
   * Start a new session for a user id. Returns `{ token, session }`; the raw
   * token is only ever available here, at creation time.
   */
  create(userId, { userAgent = '', ip = '' } = {}) {
    if (!Number.isInteger(userId)) {
      throw new TypeError('A session requires an integer "userId"');
    }

    const token = createToken();
    const timestamp = this.now();
    const session = {
      userId,
      createdAt: new Date(timestamp).toISOString(),
      lastSeenAt: new Date(timestamp).toISOString(),
      expiresAt: timestamp + this.ttlMs,
      userAgent: String(userAgent).slice(0, 200),
      ip: String(ip),
    };

    this.sessions.set(hashToken(token), session);
    return { token, session: { ...session } };
  }

  /**
   * Look up a session by raw token, without extending its lifetime.
   * Expired sessions are dropped and reported as missing.
   */
  get(token) {
    if (typeof token !== 'string' || token.length === 0) return null;

    const key = hashToken(token);
    const session = this.sessions.get(key);
    if (!session) return null;

    if (session.expiresAt <= this.now()) {
      this.sessions.delete(key);
      return null;
    }
    return { ...session };
  }

  /**
   * Validate a token and slide its expiry forward (sliding-window sessions).
   * Returns the refreshed session, or null when the token is unknown/expired.
   */
  touch(token) {
    if (typeof token !== 'string' || token.length === 0) return null;

    const key = hashToken(token);
    const session = this.sessions.get(key);
    if (!session) return null;

    const timestamp = this.now();
    if (session.expiresAt <= timestamp) {
      this.sessions.delete(key);
      return null;
    }

    session.lastSeenAt = new Date(timestamp).toISOString();
    session.expiresAt = timestamp + this.ttlMs;
    return { ...session };
  }

  /**
   * Destroy a single session. Returns true when something was removed.
   */
  destroy(token) {
    if (typeof token !== 'string' || token.length === 0) return false;
    return this.sessions.delete(hashToken(token));
  }

  /**
   * Destroy every session belonging to a user — used after a password change
   * so other devices are forced to log in again.
   *
   * Pass `except` (a raw token) to keep the current session alive.
   */
  destroyAllForUser(userId, { except } = {}) {
    const keep = typeof except === 'string' && except ? hashToken(except) : null;
    let removed = 0;

    for (const [key, session] of this.sessions) {
      if (session.userId !== userId) continue;
      if (keep && key === keep) continue;
      this.sessions.delete(key);
      removed += 1;
    }
    return removed;
  }

  /**
   * List the live sessions for a user (no tokens, safe to serialise).
   */
  listForUser(userId) {
    const timestamp = this.now();
    const out = [];
    for (const session of this.sessions.values()) {
      if (session.userId !== userId || session.expiresAt <= timestamp) continue;
      out.push({ ...session });
    }
    return out;
  }

  /**
   * Remove every expired session. Returns how many were purged.
   */
  sweep() {
    const timestamp = this.now();
    let removed = 0;
    for (const [key, session] of this.sessions) {
      if (session.expiresAt <= timestamp) {
        this.sessions.delete(key);
        removed += 1;
      }
    }
    return removed;
  }

  clear() {
    this.sessions.clear();
  }

  /** Number of sessions currently held, including any not yet swept. */
  get size() {
    return this.sessions.size;
  }
}

module.exports = {
  SessionStore,
  createToken,
  hashToken,
  parseCookies,
  buildSessionCookie,
  buildClearCookie,
  SESSION_COOKIE,
  DEFAULT_TTL_MS,
};
