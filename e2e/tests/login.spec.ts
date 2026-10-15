import { test, expect } from '../fixtures/test.fixtures';
import { DEMO_USER } from '../utils/helpers';

test.describe('Login page', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.open();
  });

  test('shows the heading and page title', async ({ loginPage }) => {
    await expect(loginPage.heading).toBeVisible();
    await expect(loginPage.page).toHaveTitle(/Log in/);
  });

  test('logs in with the demo account', async ({ loginPage }) => {
    await loginPage.login(DEMO_USER.email, DEMO_USER.password);
    await expect(loginPage.statusMessage).toContainText(/Logged in as/);
  });

  test('toggles password visibility', async ({ loginPage }) => {
    await loginPage.passwordInput.fill(DEMO_USER.password);
    await expect(loginPage.passwordInput).toHaveAttribute('type', 'password');

    await loginPage.togglePassword();
    await expect(loginPage.passwordInput).toHaveAttribute('type', 'text');

    await loginPage.togglePassword();
    await expect(loginPage.passwordInput).toHaveAttribute('type', 'password');
  });
});
