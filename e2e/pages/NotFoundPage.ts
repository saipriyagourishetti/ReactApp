import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class NotFoundPage extends BasePage {
  protected readonly path = '/this-route-does-not-exist';

  readonly heading: Locator;
  readonly homeLink: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { name: 'Page not found' });
    this.homeLink = page.getByRole('link', { name: 'Go to home' });
  }

  async goBackHome(): Promise<void> {
    await this.homeLink.click();
  }
}
