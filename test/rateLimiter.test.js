'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { RateLimiter, DEFAULT_LIMIT, DEFAULT_WINDOW_MS } = require('../src/rateLimiter');

function fakeClock(start = 1_700_000_000_000) {
  let current = start;
  return {
    now: () => current,
    advance(ms) {
      current += ms;
    },
  };
}

test('defaults are 5 attempts per 15 minutes', () => {
  assert.equal(DEFAULT_LIMIT, 5);
  assert.equal(DEFAULT_WINDOW_MS, 15 * 60 * 1000);

  const limiter = new RateLimiter();
  assert.equal(limiter.limit, 5);
  assert.equal(limiter.windowMs, 15 * 60 * 1000);
});

test('the constructor validates its options', () => {
  assert.throws(() => new RateLimiter({ limit: 0 }), /positive integer/);
  assert.throws(() => new RateLimiter({ limit: 1.5 }), /positive integer/);
  assert.throws(() => new RateLimiter({ windowMs: 0 }), /positive number/);
  assert.throws(() => new RateLimiter({ windowMs: Number.NaN }), /positive number/);
});

test('a fresh key is never limited', () => {
  const limiter = new RateLimiter({ limit: 3 });
  const state = limiter.check('1.1.1.1|ada@example.com');

  assert.equal(state.limited, false);
  assert.equal(state.remaining, 3);
  assert.equal(state.retryAfterMs, 0);
  assert.equal(limiter.size, 0, 'check must not record an attempt');
});

test('fail counts down the remaining attempts', () => {
  const limiter = new RateLimiter({ limit: 3 });

  assert.equal(limiter.fail('k').remaining, 2);
  assert.equal(limiter.fail('k').remaining, 1);

  const last = limiter.fail('k');
  assert.equal(last.remaining, 0);
  assert.equal(last.limited, true);
});

test('the key is locked once the limit is reached', () => {
  const limiter = new RateLimiter({ limit: 2, windowMs: 60_000 });
  limiter.fail('k');
  limiter.fail('k');

  const state = limiter.check('k');
  assert.equal(state.limited, true);
  assert.ok(state.retryAfterMs > 0 && state.retryAfterMs <= 60_000);
});

test('keys are tracked independently', () => {
  const limiter = new RateLimiter({ limit: 1 });
  limiter.fail('ip-a|ada@example.com');

  assert.equal(limiter.check('ip-a|ada@example.com').limited, true);
  assert.equal(limiter.check('ip-b|ada@example.com').limited, false);
  assert.equal(limiter.check('ip-a|alan@example.com').limited, false);
});

test('attempts fall out of the sliding window over time', () => {
  const clock = fakeClock();
  const limiter = new RateLimiter({ limit: 2, windowMs: 1000, now: clock.now });

  limiter.fail('k');
  limiter.fail('k');
  assert.equal(limiter.check('k').limited, true);

  clock.advance(1001);
  assert.equal(limiter.check('k').limited, false);
  assert.equal(limiter.check('k').remaining, 2);
});

test('the window slides rather than resetting in fixed blocks', () => {
  const clock = fakeClock();
  const limiter = new RateLimiter({ limit: 2, windowMs: 1000, now: clock.now });

  limiter.fail('k'); // t=0
  clock.advance(600);
  limiter.fail('k'); // t=600
  assert.equal(limiter.check('k').limited, true);

  clock.advance(500); // t=1100 — the first attempt has aged out
  const state = limiter.check('k');
  assert.equal(state.limited, false);
  assert.equal(state.remaining, 1, 'the t=600 attempt is still counted');
});

test('retryAfterMs shrinks as the oldest attempt ages', () => {
  const clock = fakeClock();
  const limiter = new RateLimiter({ limit: 1, windowMs: 1000, now: clock.now });
  limiter.fail('k');

  assert.equal(limiter.check('k').retryAfterMs, 1000);
  clock.advance(400);
  assert.equal(limiter.check('k').retryAfterMs, 600);
});

test('reset clears a key after a successful login', () => {
  const limiter = new RateLimiter({ limit: 2 });
  limiter.fail('k');
  limiter.fail('k');
  assert.equal(limiter.check('k').limited, true);

  assert.equal(limiter.reset('k'), true);
  assert.equal(limiter.check('k').limited, false);
  assert.equal(limiter.reset('k'), false, 'resetting an unknown key is a no-op');
});

test('sweep drops keys whose attempts have all expired', () => {
  const clock = fakeClock();
  const limiter = new RateLimiter({ limit: 5, windowMs: 1000, now: clock.now });
  limiter.fail('old');

  clock.advance(1001);
  limiter.fail('new');

  assert.equal(limiter.sweep(), 1);
  assert.equal(limiter.size, 1);
  assert.equal(limiter.check('new').remaining, 4);
});

test('keys are coerced to strings so numeric ids work', () => {
  const limiter = new RateLimiter({ limit: 1 });
  limiter.fail(42);

  assert.equal(limiter.check('42').limited, true);
});

test('clear removes all tracked keys', () => {
  const limiter = new RateLimiter();
  limiter.fail('a');
  limiter.fail('b');

  limiter.clear();
  assert.equal(limiter.size, 0);
});
