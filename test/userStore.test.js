'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { UserStore } = require('../src/userStore');

test('creates a user and assigns an incremental id', () => {
  const store = new UserStore();
  const user = store.create({ name: 'Ada', email: 'Ada@Example.com' });

  assert.equal(user.id, 1);
  assert.equal(user.email, 'ada@example.com');
  assert.equal(user.role, 'user');
  assert.equal(store.size, 1);
});

test('rejects invalid input', () => {
  const store = new UserStore();
  assert.throws(() => store.create({ name: '', email: 'a@b.com' }), TypeError);
  assert.throws(() => store.create({ name: 'Bob', email: 'not-an-email' }), TypeError);
});

test('rejects duplicate emails', () => {
  const store = new UserStore([{ name: 'Ada', email: 'ada@example.com' }]);
  assert.throws(() => store.create({ name: 'Ada 2', email: 'ada@example.com' }), /already exists/);
});

test('finds users by id and email', () => {
  const store = new UserStore([{ name: 'Alan', email: 'alan@example.com' }]);

  assert.equal(store.findById(1).name, 'Alan');
  assert.equal(store.findByEmail('ALAN@example.com').id, 1);
  assert.equal(store.findById(99), null);
});

test('lists and filters users by role', () => {
  const store = new UserStore([
    { name: 'Ada', email: 'ada@example.com', role: 'admin' },
    { name: 'Alan', email: 'alan@example.com' },
  ]);

  assert.equal(store.list().length, 2);
  assert.deepEqual(store.list({ role: 'admin' }).map((u) => u.name), ['Ada']);
});

test('updates only allowed fields', () => {
  const store = new UserStore([{ name: 'Ada', email: 'ada@example.com' }]);
  const updated = store.update(1, { role: 'admin', id: 999 });

  assert.equal(updated.role, 'admin');
  assert.equal(updated.id, 1);
});

test('removes a user', () => {
  const store = new UserStore([{ name: 'Ada', email: 'ada@example.com' }]);

  assert.equal(store.remove(1), true);
  assert.equal(store.remove(1), false);
  assert.equal(store.size, 0);
});
