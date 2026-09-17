# AGENTS.md

## Repo identity

Despite the directory name `ReactApp-git`, this is an **Angular 17 + Node.js** project. No React code exists.

---

## Structure

```
ReactApp-git/
├── src/            ← Zero-dependency Node HTTP server (CommonJS)
│   ├── server.js   ← Main server entrypoint (port 3000)
│   ├── calculator.js
│   └── userStore.js
├── public/         ← Static HTML/JS/CSS (served by server.js, legacy)
├── test/           ← Node built-in test runner (node:test)
└── client/         ← Angular 17 SPA (separate package, standalone components)
    └── src/app/
        ├── core/   ← Services, models, validators
        ├── pages/  ← Route components (lazy-loaded)
        └── shared/ ← Shared components and directives
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
- **In-memory store only** — `UserStore` resets on server restart. The seeded demo account is `ada@example.com` / `analytical1`.
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

| Method | Route | Success | Error codes |
|--------|-------|---------|-------------|
| GET | `/api/users` | `200 { count, users[] }` | — |
| POST | `/api/signup` | `201 { user }` | `400` validation, `409` duplicate email |
| POST | `/api/login` | `200 { user }` | `400` missing fields, `401` bad credentials |

Error responses: `{ error: string, field?: string }` — `field` maps to the offending form control name.

Password rules enforced on both client and server: ≥8 chars, at least one letter and one number.

---

## Lockfile

Only `client/package-lock.json` exists (lockfileVersion 3, npm v7+). No lockfile at repo root.

---

## No CI or pre-commit hooks configured.
