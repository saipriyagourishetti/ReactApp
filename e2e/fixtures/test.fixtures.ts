import { test as base, expect } from '@playwright/test';
import { LoginPage } from '../pages';

/** Page objects available to every test as fixtures. */
type PageFixtures = {
  loginPage: LoginPage;
};

/**
 * Extended `test` — register new page objects here so they can be
 * destructured in any spec: `test('...', async ({ loginPage }) => { ... })`.
 */
export const test = base.extend<PageFixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
});

export { expect };
