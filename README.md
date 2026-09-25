# githubtest-dummy-project

A small, dependency-free Node.js project created purely for testing repositories, CI pipelines and tooling.

## Requirements

- Node.js 18 or newer (uses the built-in `node:test` runner)

## Project structure

```
.
├── package.json
├── README.md
├── .gitignore
├── public
│   ├── index.html      # marketing landing page
│   ├── signup.html     # signup / account creation page
│   ├── login.html      # login page
│   ├── styles.css      # shared stylesheet
│   └── app.js          # client-side signup + login validation and fetch
├── src
│   ├── server.js        # HTTP server entry point (creates server, seeds demo account)
│   ├── app.js           # request handler — composes middleware and router
│   ├── router.js        # method+path dispatcher; returns 404/405 for unknown routes
│   ├── middleware.js     # compose(), requestLogger(), errorHandler(), attachAuth()
│   ├── http.js          # send(), json(), setCookie(), parseCookies(), readBody()
│   ├── auth.js          # requireAuth() guard + session-cookie helpers
│   ├── static.js        # static file serving from public/
│   ├── config.js        # centralised environment-variable defaults
│   ├── index.js         # CLI demo entry point
│   ├── calculator.js    # arithmetic helpers
│   ├── userStore.js     # in-memory user store with password hashing
│   ├── sessionStore.js  # cookie-based session tokens with sliding expiry
│   ├── rateLimiter.js   # sliding-window login throttling
│   └── routes
│       ├── index.js          # registers all route modules with the router
│       ├── auth.routes.js    # /api/signup, /api/login, /api/logout, /api/me, /api/password, /api/sessions
│       ├── users.routes.js   # /api/users
│       └── health.routes.js  # /api/health
└── test
    ├── calculator.test.js
    ├── userStore.test.js
    ├── auth.test.js          # password hashing + credential verification
    ├── sessionStore.test.js  # session tokens, TTL and cookie helpers
    ├── rateLimiter.test.js   # sliding-window throttling
    └── server.test.js        # end-to-end HTTP tests for every endpoint
```

## Usage

Start the web server (landing, signup and login pages):

```bash
npm start
```

Then open:

- Landing page: http://localhost:3000/
- Signup page: http://localhost:3000/signup.html
- Login page: http://localhost:3000/login.html
- Users API: http://localhost:3000/api/users
- Health check: http://localhost:3000/api/health

A demo account is seeded at startup:

| Email | Password |
| --- | --- |
| `ada@example.com` | `analytical1` |

Override the port with the `PORT` environment variable:

```bash
PORT=8080 npm start
```

### Environment variables

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `3000` | Port the HTTP server listens on |
| `COOKIE_SECURE` | unset | Set to `1` to add `Secure` to the session cookie (HTTPS only) |
| `QUIET` | unset | Set to `1` to silence the per-request access log |
| `NODE_ENV` | unset | `test` also silences the access log |

Run the original CLI demo:

```bash
npm run demo
```

Run the test suite:

```bash
npm test
```

## Web pages

### Landing page (`/`)

A responsive single-page marketing layout with a hero section, feature cards, a
"how it works" walkthrough, pricing tiers and a closing call-to-action. Every
call-to-action links to the signup page.

### Signup page (`/signup.html`)

A form with client-side validation for name, email, password strength, password
confirmation and terms acceptance. On success it POSTs to `/api/signup`, which
creates the account in the in-memory [`UserStore`](src/userStore.js) and returns
the created record.

### Login page (`/login.html`)

An email + password form that POSTs to `/api/login`. Credentials are checked
against the stored salted `scrypt` hash. Failed attempts always return the same
generic message (`Incorrect email or password.`) so the endpoint does not reveal
which emails are registered.

## HTTP API

| Method | Route | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/` | – | Serves the landing page |
| `GET` | `/signup.html` | – | Serves the signup page |
| `GET` | `/login.html` | – | Serves the login page |
| `POST` | `/api/signup` | – | Creates a user from `{ name, email, password, role }` — returns `201` with the user **and a session cookie**, `400` on validation errors, `409` on duplicate email |
| `POST` | `/api/login` | – | Verifies `{ email, password }` — returns `200` with the user **and a session cookie**, `400` on missing fields, `401` on bad credentials, `429` when throttled |
| `POST` | `/api/logout` | optional | Destroys the current session and clears the cookie — always `200 { ok, destroyed }` |
| `GET` | `/api/me` | required | Returns `{ user, session }` for the caller and slides the session expiry forward; `401` without a valid cookie |
| `GET` | `/api/sessions` | required | Lists the caller's active sessions (`createdAt`, `lastSeenAt`, `expiresAt`, `userAgent`, `ip`) — never any tokens |
| `POST`/`PUT` | `/api/password` | required | Changes the password from `{ currentPassword, newPassword }` — returns `200 { user, revokedSessions }`, `400` on weak/reused passwords, `401` on a wrong current password |
| `GET` | `/api/users` | – | Returns `{ count, users }` for everything currently in the store |
| `GET` | `/api/health` | – | Liveness probe: `{ status, uptimeSeconds, startedAt, users, sessions, node }` |

Any other `/api/*` path returns a JSON `404`, and a wrong method on a known
route returns `405` with an `Allow` header.

> Users and sessions live in memory only — restarting the server clears them.
> Password hashes and session tokens are never included in any API response.

### Sessions

A successful signup or login issues an opaque 256-bit token and returns it as a
cookie:

```
Set-Cookie: sid=<64 hex chars>; Path=/; HttpOnly; SameSite=Lax; Max-Age=1800
```

- Only the **SHA-256 hash** of the token is kept server-side, so a leaked store
  cannot be replayed directly.
- Sessions use a **sliding 30-minute expiry** — every authenticated request
  refreshes the window via `SessionStore.touch()`.
- `HttpOnly` keeps the token away from client-side JavaScript and `SameSite=Lax`
  blocks the obvious CSRF vectors. Add `Secure` with `COOKIE_SECURE=1`.
- Expired sessions are purged lazily on read, plus by a sweeper that runs every
  5 minutes.
- Changing a password revokes **every other** session for that user, so a cookie
  stolen elsewhere immediately stops working.

```bash
# log in, keep the cookie, then use it
curl -c jar.txt -X POST http://localhost:3000/api/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"ada@example.com","password":"analytical1"}'

curl -b jar.txt http://localhost:3000/api/me
curl -b jar.txt -X POST http://localhost:3000/api/logout
```

### Login rate limiting

Failed logins are throttled per `ip|email` pair: **5 attempts per 15 minutes**.

- Each `401` response includes `attemptsRemaining` so a UI can warn the user.
- Once the limit is hit the endpoint replies `429` with a `Retry-After` header
  and `{ error, retryAfter }`, even if the password is correct.
- Only *failures* are counted, and a successful login resets the counter, so
  normal typos never lock anyone out.
- Keying on ip **and** email means one noisy address cannot lock out someone
  else's account.

### Request logging

Every response is logged as `<iso timestamp> <method> <url> <status> <ms>`, for
example:

```
2026-09-18T06:14:00.123Z POST /api/login 200 4.7ms
```

Set `QUIET=1` (or `NODE_ENV=test`) to turn the log off.

## Password handling

Passwords are hashed with Node's built-in [`crypto.scryptSync`](src/userStore.js)
using a random 16-byte salt per user, and stored as `scrypt$<salt>$<hash>`.
Verification uses `crypto.timingSafeEqual` for a constant-time comparison.

Requirements enforced on both the client and the server: at least 8 characters,
including at least one letter and one number.

> This is still a demo: sessions are held in a plain `Map`, so they are lost on
> restart and are not shared between processes. Swap `SessionStore` for Redis (or
> similar) before using anything like this for real.

## Modules

### `calculator`

| Function | Description |
| --- | --- |
| `add(a, b)` | Returns `a + b` |
| `subtract(a, b)` | Returns `a - b` |
| `multiply(a, b)` | Returns `a * b` |
| `divide(a, b)` | Returns `a / b`, throws `RangeError` when `b === 0` |
| `power(base, exp)` | Returns `base ** exp` |
| `sum(values)` | Sum of an array of numbers |
| `average(values)` | Mean of a non-empty array |

### `UserStore`

An in-memory store with `create`, `findById`, `findByEmail`, `list`, `update`,
`setPassword`, `verifyCredentials`, `remove` and a `size` getter. Emails are
normalised to lowercase and must be unique.

Every method returns a *public* record: the internal `passwordHash` is stripped
and replaced by a boolean `hasPassword` flag. The `password` field is optional,
so seed data and existing callers keep working unchanged.

```js

