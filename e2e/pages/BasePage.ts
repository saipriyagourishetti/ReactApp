import { Locator, Page } from '@playwright/test';

/** Shared behaviour for all page objects. Assertions belong in specs, not here. */
export abstract class BasePage {
  /** Path relative to the configured baseURL. */
  protected abstract readonly path: string;

  readonly header: Locator;

  constructor(protected readonly page: Page) {
    this.header = page.getByRole('banner');
  }

  async goto(): Promise<void> {
    await this.page.goto(this.path);
  }
}
