import { test, expect } from '../fixtures';

test.describe('Not found', () => {
  test.beforeEach(async ({ notFoundPage }) => {
    await notFoundPage.goto();
  });

  test('shows the 404 page for an unknown route', async ({ notFoundPage }) => {
    await expect(notFoundPage.heading, '404 heading should be visible').toBeVisible();
  });

  test('links back to the home page', async ({ page, notFoundPage }) => {
    await notFoundPage.goBackHome();

    await expect(page, 'should navigate back to the home page').toHaveURL(/\/$/);
  });
});
