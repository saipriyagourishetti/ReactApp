'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  SessionStore,
  createToken,
  hashToken,
  parseCookies,
  buildSessionCookie,
  buildClearCookie,
  SESSION_COOKIE,
} = require('../src/sessionStore');

/**
 * A controllable clock so TTL behaviour can be tested without waiting.
 */
function fakeClock(start = 1_700_000_000_000) {
  let current = start;
  return {
    now: () => current,
    advance(ms) {
      current += ms;
    },
  };
}

/* ---------------- Token primitives ---------------- */

test('createToken produces unique 256-bit hex tokens', () => {
  const a = createToken();
  const b = createToken();

  assert.equal(a.length, 64);
  assert.match(a, /^[0-9a-f]{64}$/);
  assert.notEqual(a, b);
});

test('hashToken is deterministic and hides the raw token', () => {
  const token = createToken();

  assert.equal(hashToken(token), hashToken(token));
  assert.notEqual(hashToken(token), token);
  assert.notEqual(hashToken(token), hashToken(createToken()));
});

/* ---------------- Cookie helpers ---------------- */

test('parseCookies reads multiple pairs and decodes values', () => {
  const cookies = parseCookies('sid=abc123; theme=dark; note=hello%20world');

  assert.equal(cookies.sid, 'abc123');
  assert.equal(cookies.theme, 'dark');
  assert.equal(cookies.note, 'hello world');
});

test('parseCookies tolerates missing or malformed headers', () => {
  assert.deepEqual({ ...parseCookies(undefined) }, {});
  assert.deepEqual({ ...parseCookies('') }, {});
  assert.deepEqual({ ...parseCookies('garbage') }, {});
  assert.deepEqual({ ...parseCookies('=novalue') }, {});
  assert.equal(parseCookies('a=1; broken; b=2').b, '2');
});

test('buildSessionCookie sets the hardening attributes', () => {
  const cookie = buildSessionCookie('tok', { maxAgeMs: 60_000 });

  assert.match(cookie, new RegExp(`^${SESSION_COOKIE}=tok;`));
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Lax/);
  assert.match(cookie, /Path=\//);
  assert.match(cookie, /Max-Age=60/);
  assert.equal(/Secure/.test(cookie), false);
});

test('buildSessionCookie can opt into Secure for HTTPS', () => {
  assert.match(buildSessionCookie('tok', { secure: true }), /Secure/);
});

test('buildClearCookie expires the cookie immediately', () => {
  const cookie = buildClearCookie();

  assert.match(cookie, /^sid=;/);
  assert.match(cookie, /Max-Age=0/);
  assert.match(cookie, /HttpOnly/);
});

/* ---------------- Session lifecycle ---------------- */

test('create returns a token and records metadata', () => {
  const store = new SessionStore();
  const { token, session } = store.create(7, { userAgent: 'jest/1.0', ip: '10.0.0.1' });

  assert.match(token, /^[0-9a-f]{64}$/);
  assert.equal(session.userId, 7);
  assert.equal(session.userAgent, 'jest/1.0');
  assert.equal(session.ip, '10.0.0.1');
  assert.equal(store.size, 1);
});

test('create requires an integer user id', () => {
  const store = new SessionStore();

  assert.throws(() => store.create('7'), /integer/);
  assert.throws(() => store.create(undefined), /integer/);
  assert.equal(store.size, 0);
});

test('the raw token is never stored, only its hash', () => {
  const store = new SessionStore();
  const { token } = store.create(1);

  assert.equal(store.sessions.has(token), false);
  assert.equal(store.sessions.has(hashToken(token)), true);
});

test('get resolves a valid token and rejects unknown ones', () => {
  const store = new SessionStore();
  const { token } = store.create(42);

  assert.equal(store.get(token).userId, 42);
  assert.equal(store.get(createToken()), null);
  assert.equal(store.get(''), null);
  assert.equal(store.get(undefined), null);
});

test('sessions expire once the TTL elapses', () => {
  const clock = fakeClock();
  const store = new SessionStore({ ttlMs: 1000, now: clock.now });
  const { token } = store.create(1);

  clock.advance(999);
  assert.ok(store.get(token), 'still valid just before the TTL');

  clock.advance(1);
  assert.equal(store.get(token), null, 'expired exactly at the TTL');
  assert.equal(store.size, 0, 'the expired session is dropped on read');
});

test('touch slides the expiry forward on each request', () => {
  const clock = fakeClock();
  const store = new SessionStore({ ttlMs: 1000, now: clock.now });
  const { token } = store.create(1);

  clock.advance(900);
  assert.ok(store.touch(token), 'refreshed before expiring');

  clock.advance(900);
  assert.ok(store.get(token), 'the window moved, so it is still alive');

  clock.advance(1001);
  assert.equal(store.touch(token), null, 'idle for longer than the TTL');
});

test('touch updates lastSeenAt but keeps createdAt', () => {
  const clock = fakeClock();
  const store = new SessionStore({ ttlMs: 10_000, now: clock.now });
  const { token, session } = store.create(1);

  clock.advance(5000);
  const refreshed = store.touch(token);

  assert.equal(refreshed.createdAt, session.createdAt);
  assert.notEqual(refreshed.lastSeenAt, session.lastSeenAt);
});

test('get does not extend the session lifetime', () => {
  const clock = fakeClock();
  const store = new SessionStore({ ttlMs: 1000, now: clock.now });
  const { token } = store.create(1);

  clock.advance(900);
  store.get(token);
  clock.advance(200);

  assert.equal(store.get(token), null, 'get must be read-only');
});

test('destroy removes a single session', () => {
  const store = new SessionStore();
  const { token } = store.create(1);

  assert.equal(store.destroy(token), true);
  assert.equal(store.destroy(token), false, 'destroying twice is a no-op');
  assert.equal(store.destroy(''), false);
  assert.equal(store.get(token), null);
});

test('destroyAllForUser revokes every device for one user', () => {
  const store = new SessionStore();
  const first = store.create(1);
  const second = store.create(1);
  const other = store.create(2);

  assert.equal(store.destroyAllForUser(1), 2);
  assert.equal(store.get(first.token), null);
  assert.equal(store.get(second.token), null);
  assert.ok(store.get(other.token), 'other users are untouched');
});

test('destroyAllForUser can keep the current session alive', () => {
  const store = new SessionStore();
  const keep = store.create(1);
  const drop = store.create(1);

  assert.equal(store.destroyAllForUser(1, { except: keep.token }), 1);
  assert.ok(store.get(keep.token));
  assert.equal(store.get(drop.token), null);
});

test('listForUser returns only that user\'s live sessions', () => {
  const clock = fakeClock();
  const store = new SessionStore({ ttlMs: 1000, now: clock.now });
  store.create(1, { ip: '1.1.1.1' });
  store.create(2, { ip: '2.2.2.2' });

  assert.equal(store.listForUser(1).length, 1);
  assert.equal(store.listForUser(1)[0].ip, '1.1.1.1');
  assert.equal(store.listForUser(99).length, 0);

  clock.advance(2000);
  assert.equal(store.listForUser(1).length, 0, 'expired sessions are hidden');
});

test('sweep purges only expired sessions', () => {
  const clock = fakeClock();
  const store = new SessionStore({ ttlMs: 1000, now: clock.now });
  store.create(1);

  clock.advance(1500);
  const fresh = store.create(2);

  assert.equal(store.sweep(), 1);
  assert.equal(store.size, 1);
  assert.ok(store.get(fresh.token));
});

test('clear drops everything', () => {
  const store = new SessionStore();
  store.create(1);
  store.create(2);

  store.clear();
  assert.equal(store.size, 0);
});
