'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { loadConfig, toBool, toInt } = require('../src/config');

/* ---------------- Primitive coercion ---------------- */

test('toBool accepts the usual truthy spellings', () => {
  for (const value of ['1', 'true', 'TRUE', 'yes', 'on', ' true ']) {
    assert.equal(toBool(value), true, `"${value}" should be true`);
  }
});

test('toBool treats anything else as false', () => {
  for (const value of ['0', 'false', 'no', 'off', 'banana']) {
    assert.equal(toBool(value), false, `"${value}" should be false`);
  }
});

test('toBool falls back when the value is absent', () => {
  assert.equal(toBool(undefined), false);
  assert.equal(toBool(''), false);
  assert.equal(toBool(undefined, true), true, 'explicit fallback wins');
});

test('toInt parses positive integers and rejects the rest', () => {
  assert.equal(toInt('8080', 3000), 8080);
  assert.equal(toInt(undefined, 3000), 3000);
  assert.equal(toInt('not-a-number', 3000), 3000);
  assert.equal(toInt('0', 3000), 3000, 'zero is not a valid port or window');
  assert.equal(toInt('-5', 3000), 3000);
});

/* ---------------- loadConfig ---------------- */

test('loadConfig provides sane defaults from an empty environment', () => {
  const config = loadConfig({}, {});

  assert.equal(config.port, 3000);
  assert.equal(config.cookieSecure, false);
  assert.equal(config.quiet, false);
  assert.equal(config.sessionTtlMs, 30 * 60 * 1000);
  assert.equal(config.loginLimit, 5);
  assert.equal(config.loginWindowMs, 15 * 60 * 1000);
  assert.equal(config.maxBodyBytes, 1e5);
  assert.equal(path.basename(config.publicDir), 'public');
});

test('loadConfig reads every supported variable', () => {
  const config = loadConfig(
    {},
    {
      PORT: '8080',
      COOKIE_SECURE: '1',
      QUIET: 'true',
      SESSION_TTL_MINUTES: '5',
      LOGIN_LIMIT: '3',
      LOGIN_WINDOW_MINUTES: '2',
      SWEEP_INTERVAL_MINUTES: '1',
      MAX_BODY_BYTES: '2048',
    }
  );

  assert.equal(config.port, 8080);
  assert.equal(config.cookieSecure, true);
  assert.equal(config.quiet, true);
  assert.equal(config.sessionTtlMs, 5 * 60 * 1000);
  assert.equal(config.loginLimit, 3);
  assert.equal(config.loginWindowMs, 2 * 60 * 1000);
  assert.equal(config.sweepIntervalMs, 60 * 1000);
  assert.equal(config.maxBodyBytes, 2048);
});

test('NODE_ENV=test implies quiet so the suite stays readable', () => {
  assert.equal(loadConfig({}, { NODE_ENV: 'test' }).quiet, true);
  assert.equal(loadConfig({}, { NODE_ENV: 'production' }).quiet, false);
});

test('explicit overrides beat the environment', () => {
  const config = loadConfig({ port: 1234, quiet: true }, { PORT: '8080', QUIET: '0' });

  assert.equal(config.port, 1234);
  assert.equal(config.quiet, true);
});

test('the seeded demo account is present by default', () => {
  const [seed] = loadConfig({}, {}).seedUsers;

  assert.equal(seed.email, 'ada@example.com');
  assert.equal(seed.password, 'analytical1');
  assert.equal(seed.role, 'admin');
});

test('seedUsers can be overridden, e.g. to boot an empty store', () => {
  assert.deepEqual(loadConfig({ seedUsers: [] }, {}).seedUsers, []);
});

test('loadConfig does not mutate the environment it reads', () => {
  const env = { PORT: '8080' };
  loadConfig({ port: 1 }, env);

  assert.deepEqual(env, { PORT: '8080' });
});
