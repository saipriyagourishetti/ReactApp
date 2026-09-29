import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';

import { AuthService } from './auth.service';

/**
 * Protects routes that require an authenticated session.
 *
 * If the user is not logged in they are redirected to /login with a `returnUrl`
 * query parameter so they land back on the intended page after a successful
 * login.
 *
 * Usage in app.routes.ts:
 *   canActivate: [authGuard]
 */
export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated) {
    return true;
  }

  // Preserve the original URL so we can redirect back after login.
  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url },
  });
};

/**
 * Prevents already-authenticated users from accessing guest-only pages
 * (login, signup).
 *
 * If the user already has a session they are redirected to /dashboard.
 *
 * Usage in app.routes.ts:
 *   canActivate: [guestGuard]
 */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated) {
    return true;
  }

  return router.createUrlTree(['/dashboard']);
};
