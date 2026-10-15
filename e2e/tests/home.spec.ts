import { test, expect } from '../fixtures';

test.describe('Home', () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.goto();
  });

  test('shows the landing page heading', async ({ homePage }) => {
    await expect(homePage.heading, 'home page H1 should be visible').toBeVisible();
    await expect(homePage.heading, 'H1 should contain the landing headline').toContainText(
      'Ship your side project',
    );
  });
});
