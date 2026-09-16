'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  UserStore,
  hashPassword,
  verifyPassword,
  validatePassword,
} = require('../src/userStore');

/* ---------------- Password primitives ---------------- */

test('hashPassword produces a salted, self-describing hash', () => {
  const hash = hashPassword('analytical1');
  const [scheme, salt, digest] = hash.split('$');

  assert.equal(scheme, 'scrypt');
  assert.equal(salt.length, 32); // 16 random bytes, hex encoded
  assert.equal(digest.length, 128); // 64 byte key, hex encoded
  assert.ok(!hash.includes('analytical1'), 'hash must not contain the plaintext');
});

test('the same password hashes differently each time (unique salts)', () => {
  assert.notEqual(hashPassword('analytical1'), hashPassword('analytical1'));
});

test('verifyPassword accepts the correct password and rejects others', () => {
  const hash = hashPassword('analytical1');

  assert.equal(verifyPassword('analytical1', hash), true);
  assert.equal(verifyPassword('Analytical1', hash), false);
  assert.equal(verifyPassword('wrong', hash), false);
  assert.equal(verifyPassword('', hash), false);
});

test('verifyPassword rejects malformed or missing hashes', () => {
  assert.equal(verifyPassword('secret12', 'not-a-hash'), false);
  assert.equal(verifyPassword('secret12', ''), false);
  assert.equal(verifyPassword('secret12', null), false);
  assert.equal(verifyPassword(null, hashPassword('secret12')), false);
});

test('validatePassword enforces length and complexity', () => {
  assert.equal(validatePassword('analytical1'), null);
  assert.match(validatePassword(''), /required/);
  assert.match(validatePassword('short1'), /at least 8/);
  assert.match(validatePassword('alphabetical'), /letter and one number/);
  assert.match(validatePassword('12345678'), /letter and one number/);
});

/* ---------------- Store integration ---------------- */

test('create stores a password hash without exposing it', () => {
  const store = new UserStore();
  const user = store.create({ name: 'Ada', email: 'ada@example.com', password: 'analytical1' });

  assert.equal(user.passwordHash, undefined);
  assert.equal(user.hasPassword, true);
  assert.equal(JSON.stringify(user).includes('analytical1'), false);
});

test('create rejects a weak password', () => {
  const store = new UserStore();
  assert.throws(
    () => store.create({ name: 'Ada', email: 'ada@example.com', password: 'weak' }),
    /at least 8/
  );
  assert.equal(store.size, 0, 'no user should be created when the password is rejected');
});

test('passwords remain optional for seed data', () => {
  const store = new UserStore([{ name: 'Alan', email: 'alan@example.com' }]);
  const user = store.findByEmail('alan@example.com');

  assert.equal(user.hasPassword, false);
  assert.equal(store.verifyCredentials('alan@example.com', 'anything1'), null);
});

test('list and findById never leak password hashes', () => {
  const store = new UserStore([
    { name: 'Ada', email: 'ada@example.com', password: 'analytical1' },
  ]);

  assert.equal(store.list()[0].passwordHash, undefined);
  assert.equal(store.findById(1).passwordHash, undefined);
  assert.equal(store.findByEmail('ada@example.com').passwordHash, undefined);
});

test('verifyCredentials succeeds with the right password', () => {
  const store = new UserStore([
    { name: 'Ada', email: 'ada@example.com', role: 'admin', password: 'analytical1' },
  ]);

  const user = store.verifyCredentials('ada@example.com', 'analytical1');
  assert.ok(user);
  assert.equal(user.name, 'Ada');
  assert.equal(user.role, 'admin');
  assert.equal(user.passwordHash, undefined);
});

test('verifyCredentials is case-insensitive on email but not on password', () => {
  const store = new UserStore([
    { name: 'Ada', email: 'ada@example.com', password: 'analytical1' },
  ]);

  assert.ok(store.verifyCredentials('ADA@Example.com', 'analytical1'));
  assert.equal(store.verifyCredentials('ada@example.com', 'ANALYTICAL1'), null);
});

test('verifyCredentials returns null for wrong password or unknown email', () => {
  const store = new UserStore([
    { name: 'Ada', email: 'ada@example.com', password: 'analytical1' },
  ]);

  assert.equal(store.verifyCredentials('ada@example.com', 'nope12345'), null);
  assert.equal(store.verifyCredentials('ghost@example.com', 'analytical1'), null);
  assert.equal(store.verifyCredentials(undefined, undefined), null);
});

test('setPassword lets an account gain or rotate a password', () => {
  const store = new UserStore([{ name: 'Alan', email: 'alan@example.com' }]);

  store.setPassword(1, 'turing1946');
  assert.ok(store.verifyCredentials('alan@example.com', 'turing1946'));

  store.setPassword(1, 'enigma1940');
  assert.equal(store.verifyCredentials('alan@example.com', 'turing1946'), null);
  assert.ok(store.verifyCredentials('alan@example.com', 'enigma1940'));

  assert.throws(() => store.setPassword(1, 'weak'), /at least 8/);
  assert.throws(() => store.setPassword(99, 'valid12345'), /No user found/);
});

test('update cannot be used to overwrite the password hash', () => {
  const store = new UserStore([
    { name: 'Ada', email: 'ada@example.com', password: 'analytical1' },
  ]);

  store.update(1, { passwordHash: 'scrypt$00$00', role: 'admin' });

  assert.equal(store.list()[0].role, 'admin');
  assert.ok(store.verifyCredentials('ada@example.com', 'analytical1'));
});
