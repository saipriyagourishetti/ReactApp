import { APP_INITIALIZER, ApplicationConfig } from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideRouter, withInMemoryScrolling } from '@angular/router';

import { APP_ROUTES } from './app.routes';
import { AuthService } from './core/auth.service';

/**
 * Root providers for the standalone application.
 *
 * `withInMemoryScrolling` reproduces the anchor-link behaviour the old
 * multi-page site got for free from the browser (e.g. "/#features").
 *
 * `APP_INITIALIZER` calls `AuthService.loadCurrentUser()` before the first
 * route renders, so guards can synchronously read `auth.currentUser()` on
 * initial navigation.
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
    {
      provide: APP_INITIALIZER,
      useFactory: (auth: AuthService) => () => auth.loadCurrentUser(),
      deps: [AuthService],
      multi: true,
    },
  ],
};
