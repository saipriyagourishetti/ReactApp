import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';

/**
 * Route guard that restricts access to authenticated users.
 *
 * When an unauthenticated visitor tries to reach a protected route they are
 * redirected to `/login`. The original destination is preserved in the
 * `redirectUrl` query parameter so that LoginComponent can send them there
 * after a successful login.
 */
export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn()) {
    return true;
  }

  return router.createUrlTree(['/login'], {
    queryParams: { redirectUrl: state.url },
  });
};
