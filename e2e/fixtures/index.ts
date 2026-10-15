import { test as base } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { NotFoundPage } from '../pages/NotFoundPage';

type Pages = {
  homePage: HomePage;
  notFoundPage: NotFoundPage;
};

/** Extended `test` that injects page objects. Import `test`/`expect` from here. */
export const test = base.extend<Pages>({
  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },
  notFoundPage: async ({ page }, use) => {
    await use(new NotFoundPage(page));
  },
});

export { expect } from '@playwright/test';
