import { ApplicationConfig } from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideRouter, withInMemoryScrolling } from '@angular/router';

import { APP_ROUTES } from './app.routes';

/**
 * Root providers for the standalone application.
 *
 * `withInMemoryScrolling` reproduces the anchor-link behaviour the old
 * multi-page site got for free from the browser (e.g. "/#features").
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(
      APP_ROUTES,
      withInMemoryScrolling({
        anchorScrolling: 'enabled',
        scrollPositionRestoration: 'enabled',
      })
    ),
    provideHttpClient(withFetch()),
  ],
};
