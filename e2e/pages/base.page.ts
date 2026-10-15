import type { Locator, Page } from '@playwright/test';

/**
 * Base class for all page objects.
 * Holds the Playwright `Page` and common navigation helpers.
 * Page objects expose locators and actions only — assertions live in specs.
 */
export abstract class BasePage {
  /** Route path of the page, relative to baseURL (e.g. '/login'). */
  protected abstract readonly path: string;

  constructor(public readonly page: Page) {}

  /** Navigate to this page's path (or a custom one) and wait for load. */
  async goto(path: string = this.path): Promise<void> {
    await this.page.goto(path);
    await this.waitForLoad();
  }

  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
  }

  async getTitle(): Promise<string> {
    return this.page.title();
  }

  getUrl(): string {
    return this.page.url();
  }

  /** Convenience wrapper around `page.locator`. */
  protected locator(selector: string): Locator {
    return this.page.locator(selector);
  }
}
