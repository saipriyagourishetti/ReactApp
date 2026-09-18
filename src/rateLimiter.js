'use strict';

/** Default policy: 5 attempts per key per 15 minutes. */
const DEFAULT_LIMIT = 5;
const DEFAULT_WINDOW_MS = 15 * 60 * 1000;

/**
 * A sliding-window rate limiter for login attempts.
 *
 * Each key (normally `ip|email`) keeps the timestamps of its recent failures.
 * Timestamps older than the window are discarded on every read, so there is no
 * background timer and memory stays proportional to recent activity.
 *
 * Only *failed* attempts are recorded: `reset` is called after a successful
 * login so legitimate users are never locked out by their own typos.
 */
class RateLimiter {
  constructor({ limit = DEFAULT_LIMIT, windowMs = DEFAULT_WINDOW_MS, now = () => Date.now() } = {}) {
    if (!Number.isInteger(limit) || limit < 1) {
      throw new TypeError('"limit" must be a positive integer');
    }
    if (!Number.isFinite(windowMs) || windowMs <= 0) {
      throw new TypeError('"windowMs" must be a positive number of milliseconds');
    }

    this.limit = limit;
    this.windowMs = windowMs;
    this.now = now;
    this.hits = new Map();
  }

  /**
   * Drop expired timestamps for a key and return the survivors.
   */
  #recent(key) {
    const cutoff = this.now() - this.windowMs;
    const timestamps = (this.hits.get(key) || []).filter((time) => time > cutoff);

    if (timestamps.length === 0) {
      this.hits.delete(key);
    } else {
      this.hits.set(key, timestamps);
    }
    return timestamps;
  }

  /**
   * Inspect a key without recording an attempt.
   *
   * Returns `{ limited, remaining, retryAfterMs }` where `retryAfterMs` is how
   * long until the oldest recorded attempt falls out of the window.
   */
  check(key) {
    const timestamps = this.#recent(String(key));
    const limited = timestamps.length >= this.limit;
    const retryAfterMs = limited
      ? Math.max(0, timestamps[0] + this.windowMs - this.now())
      : 0;

    return {
      limited,
      remaining: Math.max(0, this.limit - timestamps.length),
      retryAfterMs,
    };
  }

  /**
   * Record a failed attempt and report the state *after* it was counted.
   */
  fail(key) {
    const id = String(key);
    const timestamps = this.#recent(id);
    timestamps.push(this.now());
    this.hits.set(id, timestamps);

    const limited = timestamps.length >= this.limit;
    return {
      limited,
      remaining: Math.max(0, this.limit - timestamps.length),
      retryAfterMs: limited ? Math.max(0, timestamps[0] + this.windowMs - this.now()) : 0,
    };
  }

  /**
   * Forget a key entirely — called on a successful login.
   */
  reset(key) {
    return this.hits.delete(String(key));
  }

  /**
   * Remove keys with no attempts left inside the window.
   */
  sweep() {
    let removed = 0;
    for (const key of [...this.hits.keys()]) {
      const before = this.hits.size;
      this.#recent(key);
      if (this.hits.size < before) removed += 1;
    }
    return removed;
  }

  clear() {
    this.hits.clear();
  }

  /** Number of keys currently being tracked. */
  get size() {
    return this.hits.size;
  }
}

module.exports = { RateLimiter, DEFAULT_LIMIT, DEFAULT_WINDOW_MS };
