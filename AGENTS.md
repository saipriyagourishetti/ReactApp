# AGENTS.md

## Repo identity

Despite the directory name `ReactApp-git`, this is an **Angular 17 + Node.js** project. No React code exists.

---

## Structure

```
ReactApp-git/
├── src/                    ← Zero-dependency Node HTTP server (CommonJS)
│   ├── server.js           ← Process entrypoint: shared stores, listen, banner
│   ├── app.js              ← Composition root: builds deps + middleware chain
│   ├── config.js           ← All env-var reading in one place
│   ├── http.js             ← HttpError, senders, body parsing, request helpers
│   ├── middleware.js       ← compose(), createContext, logger, error handler
│   ├── router.js           ← Declarative route table, 405/404 handling
│   ├── static.js           ← Static file middleware with traversal guard
│   ├── auth.js             ← Session plumbing: issue, resolve, requireAuth
│   ├── sessionStore.js     ← Cookie-based session tokens with sliding expiry
│   ├── rateLimiter.js      ← Sliding-window login throttling
│   ├── userStore.js        ← In-memory user store with scrypt password hashing
│   ├── calculator.js       ← Arithmetic helpers
│   ├── index.js            ← CLI demo entry point
│   └── routes/
│       ├── index.js        ← Merges the route tables; detects duplicates at startup
│       ├── auth.routes.js  ← signup, login, logout, me, sessions, password
│       ├── users.routes.js ← User listing + ?role= filter
│       └── health.routes.js← Liveness probe
├── public/                 ← Static HTML/JS/CSS (served by static.js)
├── test/                   ← Node built-in test runner (node:test), 11 files, 181 tests
└── client/                 ← Angular 17 SPA (separate package, standalone components)
    └── src/app/
        ├── core/           ← Services, models, validators
        ├── pages/          ← Route components (lazy-loaded)
        └── shared/         ← Shared components and directives
```

Two separate `package.json` files — **not** an npm workspace, no hoisting.

---

## Commands

### Server (run from repo root)

```sh
npm start          # start HTTP server on :3000
npm test           # run all tests (node --test test/)
npm run demo       # CLI demo
npm run lint       # no-op (prints skip message)
```

### Angular client (run from `client/`)

```sh
npm install        # must run before any ng commands
npm start          # ng serve --proxy-config proxy.conf.json → :4200
npm run build      # ng build (production by default → dist/client/)
npm run typecheck  # tsc -p tsconfig.app.json --noEmit
npm run watch      # ng build --watch --configuration development
npm test           # jest (189 Angular unit tests — no browser required)
```

---

## Running tests

### Node.js backend (repo root)

**Test runner is Node's built-in `node:test`** — no Jest, Mocha, or Vitest.

```sh
node --test test/calculator.test.js                        # single file
node --test --test-name-pattern="add\(\)" test/calculator.test.js  # single test by name
```

`auth.test.js` is intentionally slower — it exercises `scryptSync` for password hashing.

### Angular client (from `client/`)

**Test runner is Jest with `jest-preset-angular`** — no browser required (jsdom).

```sh
npm test                      # run all 189 Angular unit tests
npm test -- --testPathPattern="api.service"  # run a single spec file
```

Angular test files live next to their source:

```
client/src/app/
├── app.component.spec.ts
├── core/
│   ├── api.service.spec.ts
│   ├── password-strength.spec.ts
│   ├── theme.service.spec.ts
│   ├── toast.service.spec.ts
│   └── validators.spec.ts
├── pages/
│   ├── about.component.spec.ts
│   ├── dashboard.component.spec.ts
│   ├── home.component.spec.ts
│   ├── login.component.spec.ts
│   ├── profile.component.spec.ts
│   └── signup.component.spec.ts
└── shared/
    ├── count-up.directive.spec.ts
    ├── reveal.directive.spec.ts
    ├── site-footer.component.spec.ts
    ├── site-header.component.spec.ts
    └── toast-host.component.spec.ts
```

Key test config files in `client/`:

- `jest.config.js` — Jest configuration using `jest-preset-angular`
- `setup-jest.ts` — Zone.js test environment setup + `window.matchMedia` stub
- `tsconfig.spec.json` — TypeScript config for spec files (uses `@types/jest`)

---

## Key quirks

- **Server is zero-dependency** — `src/` uses only Node built-ins (`http`, `fs`, `crypto`). Do not add npm dependencies to the root `package.json`.
- **In-memory store only** — `UserStore` and `SessionStore` reset on server restart. The seeded demo account is `ada@example.com` / `analytical1` (role: `admin`).
- **Middleware architecture** — `src/app.js` composes the chain via `compose()` from `src/middleware.js`. Route handlers in `src/routes/` receive a `ctx` object with all deps injected; they never `require()` stores directly.
- **`createApp(deps)` for test isolation** — each test can spin up its own server instance with fresh in-memory stores. Do not import shared singletons from `src/server.js` in new tests.
- **Start order matters for full-stack dev:**
  1. `npm start` (root) — server on `:3000`
  2. `cd client && npm start` — Angular dev server on `:4200`, proxies `/api/*` to `:3000`
- **Angular build defaults to production.** For dev builds with source maps: `ng build --configuration development`.
- **Angular standalone components throughout** — no NgModules.
- **TypeScript strict mode** including `strictTemplates` and `strictInjectionParameters`.
- **Module resolution is `"bundler"`** (Angular 17 / esbuild default) — required in tsconfig, do not change.
- **Theme anti-FOUC:** `client/src/index.html` has an inline script that reads `dp-theme` from `localStorage` before Angular boots. Do not remove it.

---

## API contract (shared by server and Angular client)

| Method | Route | Auth | Success | Error codes |
|--------|-------|------|---------|-------------|
| GET | `/api/health` | None | `200 { status, uptimeSeconds, … }` | — |
| GET | `/api/users` | None | `200 { count, users[] }` | `400` bad role |
| POST | `/api/signup` | None | `201 { user }` | `400` validation, `409` duplicate email |
| POST | `/api/login` | None | `200 { user }` | `400` missing fields, `401` bad credentials, `429` rate limited |
| POST | `/api/logout` | Optional | `200 { ok }` | — |
| GET | `/api/me` | Required | `200 { user, session }` | `401` |
| GET | `/api/sessions` | Required | `200 { sessions[] }` | `401` |
| POST/PUT | `/api/password` | Required | `200 { ok }` | `400` weak/reuse, `401` wrong current password |

Error responses: `{ error: string, field?: string }` — `field` maps to the offending form control name.

Password rules enforced on both client and server: ≥8 chars, at least one letter and one number.

### Session design

Sessions use `HttpOnly; SameSite=Lax` cookies (`sid=<64 hex chars>`). The raw token is never stored — only its SHA-256 hash. TTL defaults to 30 minutes, sliding on each authenticated request. Failed logins are throttled per `ip|email` pair (default: 5 attempts / 15 min window). Changing a password revokes all other sessions.

---

## Lockfile

Only `client/package-lock.json` exists (lockfileVersion 3, npm v7+). No lockfile at repo root.

---

## No CI or pre-commit hooks configured.
