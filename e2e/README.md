# E2E tests (Playwright + TypeScript)

Standalone package — not part of the root or `client/` packages.

## Setup

```sh
cd e2e
npm install
npm run install:browsers      # downloads chromium, firefox, webkit
cp .env.example .env          # optional; adjust BASE_URL if needed
```

## Run the app under test

```sh
npm start                     # repo root: Node API on :3000
cd client && npm start        # Angular dev server on :4200 (proxies /api to :3000)
```

Both servers must be running before `npm test` (no `webServer` block is configured).
The default `BASE_URL` is `http://localhost:4200`. The tests target the Angular SPA;
the static `public/` site on :3000 has a different 404 page, so it is not supported.

## Run tests

```sh
npm test                      # all projects, headless
npm run test:headed           # visible browser
npm run test:ui               # Playwright UI mode
npm run report                # open the last HTML report
npx playwright test --project=chromium tests/home.spec.ts
```

## Layout

```
e2e/
├── pages/       Page Objects (extend BasePage; no assertions inside)
├── fixtures/    Extended `test` that injects page objects
├── tests/       <feature>.spec.ts files
└── playwright.config.ts
```

## Conventions

- Specs import `test`/`expect` from `../fixtures` and interact only via page objects.
- Prefer `getByTestId` / `getByRole` / `getByLabel` locators; no `waitForTimeout`.
- Use unique data for anything a test creates; read credentials/URLs from env vars.
- Traces are recorded on first retry; HTML report goes to `playwright-report/`.
