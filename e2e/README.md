# E2E tests (Playwright + TypeScript, Page Object Model)

Separate package (not part of the root server package or the Angular client). Requires Node 20+ (Playwright's minimum).

## Structure

```
e2e/
├── pages/
│   ├── base.page.ts       ← abstract BasePage (goto, waitForLoad, getTitle, getUrl, locator)
│   ├── login.page.ts      ← LoginPage extends BasePage
│   └── index.ts           ← barrel export
├── fixtures/
│   └── test.fixtures.ts   ← registers page objects; exports extended `test` and `expect`
├── utils/
│   └── helpers.ts         ← BASE_URL, DEMO_USER, randomEmail, randomString, sleep, getEnv
├── tests/
│   └── login.spec.ts      ← sample spec
├── playwright.config.ts
├── tsconfig.json
└── .env.example
```

## Conventions

- Page objects hold locators and actions only; **assertions live in specs**.
- Specs import `test` and `expect` from `fixtures/test.fixtures.ts`, never from `@playwright/test`.
- Prefer `getByRole` / stable ids over CSS chains.

## Adding a page object

1. Create `pages/<name>.page.ts` with a class extending `BasePage` and a `path`.
2. Export it from `pages/index.ts`.
3. Register it in `fixtures/test.fixtures.ts`: add it to `PageFixtures` and to `base.extend({...})`.
4. Use it in any spec: `test('...', async ({ <name>Page }) => { ... })`.

## Running

The config has no `webServer`; start the stack first (order matters):

```sh
npm start                  # repo root → :3000
cd client && npm start     # Angular dev server → :4200
```

Then, from `e2e/`:

```sh
npm install
npx playwright install chromium
npm test                   # headless
npm run test:headed
npm run typecheck
npm run report
```

Environment overrides: `BASE_URL`, `DEMO_EMAIL`, `DEMO_PASSWORD`. Export them in your shell (e.g. `BASE_URL=http://localhost:3000 npm test`); `.env.example` only lists the names and is not loaded automatically.
