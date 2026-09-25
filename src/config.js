'use strict';

const path = require('path');

/**
 * Centralised, env-driven configuration.
 *
 * Reading `process.env` in exactly one place keeps the rest of the modules
 * pure and trivially testable: tests call `loadConfig({ ... })` with explicit
 * overrides instead of mutating the environment.
 */

const MINUTE_MS = 60 * 1000;

/** Truthy check for boolean-ish env vars ("1", "true", "yes", "on"). */
function toBool(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return /^(1|true|yes|on)$/i.test(String(value).trim());
}

/** Parse a positive integer, falling back when absent or invalid. */
function toInt(value, fallback) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Build the configuration object.
 *
 * @param {object} env  Source of truth, defaults to `process.env`.
 * @param {object} overrides  Explicit values that win over `env`.
 */
function loadConfig(overrides = {}, env = process.env) {
  const config = {
    port: toInt(env.PORT, 3000),

    /** Directory served for non-API GET requests. */
    publicDir: path.join(__dirname, '..', 'public'),

    /** Add `Secure` to the session cookie — enable when serving over HTTPS. */
    cookieSecure: toBool(env.COOKIE_SECURE),

    /** Suppress the access log (also off automatically under NODE_ENV=test). */
    quiet: toBool(env.QUIET) || env.NODE_ENV === 'test',

    /** Session lifetime; refreshed on every authenticated request. */
    sessionTtlMs: toInt(env.SESSION_TTL_MINUTES, 30) * MINUTE_MS,

    /** Failed logins allowed per ip+email inside the window. */
    loginLimit: toInt(env.LOGIN_LIMIT, 5),
    loginWindowMs: toInt(env.LOGIN_WINDOW_MINUTES, 15) * MINUTE_MS,

    /** How often expired sessions and stale rate-limit keys are purged. */
    sweepIntervalMs: toInt(env.SWEEP_INTERVAL_MINUTES, 5) * MINUTE_MS,

    /** Maximum accepted request body size, in bytes. */
    maxBodyBytes: toInt(env.MAX_BODY_BYTES, 1e5),

    /** Seed accounts created on boot. */
    seedUsers: [
      { name: 'Ada Lovelace', email: 'ada@example.com', role: 'admin', password: 'analytical1' },
    ],
  };

  return { ...config, ...overrides };
}

module.exports = { loadConfig, toBool, toInt };
