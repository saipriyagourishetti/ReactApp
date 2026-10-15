import type { Locator, Page } from '@playwright/test';
import { DEMO_USER } from '../utils/helpers';
import { BasePage } from './base.page';

/** Page object for the Angular `/login` route. */
export class LoginPage extends BasePage {
  protected readonly path = '/login';

  readonly heading: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly passwordToggle: Locator;
  readonly submitButton: Locator;
  readonly statusMessage: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { level: 1, name: 'Log in' });
    this.emailInput = page.locator('#email');
    this.passwordInput = page.locator('#password');
    this.passwordToggle = page.locator('.reveal-btn');
    this.submitButton = page.locator('#login-form button[type="submit"]');
    this.statusMessage = page.locator('#login-form .form-status');
  }

  async open(): Promise<void> {
    await this.goto();
  }

  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async fillDemoCredentials(): Promise<void> {
    await this.emailInput.fill(DEMO_USER.email);
    await this.passwordInput.fill(DEMO_USER.password);
  }

  async togglePassword(): Promise<void> {
    await this.passwordToggle.click();
  }

  async getStatusText(): Promise<string> {
    return (await this.statusMessage.textContent())?.trim() ?? '';
  }
}
