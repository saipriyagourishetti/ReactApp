import { Routes } from '@angular/router';

import { authGuard } from './core/auth.guard';

/**
 * One route per page that used to be a separate .html file in public/.
 * All pages are lazily loaded so the initial bundle stays small.
 *
 * Legacy ".html" URLs are redirected so existing links keep working.
 * Protected routes use `authGuard` which redirects unauthenticated users to
 * `/login` with a `redirectUrl` query param.
 */
export const APP_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home.component').then((m) => m.HomeComponent),
    title: 'ValueLabs Aide Autonomy — Build, test, ship faster',
  },
  {
    path: 'about',
    loadComponent: () => import('./pages/about.component').then((m) => m.AboutComponent),
    title: 'About — ValueLabs Aide Autonomy',
  },
  {
    path: 'signup',
    loadComponent: () => import('./pages/signup.component').then((m) => m.SignupComponent),
    title: 'Create your account — ValueLabs Aide Autonomy',
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login.component').then((m) => m.LoginComponent),
    title: 'Log in — ValueLabs Aide Autonomy',
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard.component').then((m) => m.DashboardComponent),
    title: 'Dashboard — ValueLabs Aide Autonomy',
    canActivate: [authGuard],
  },
  {
    path: 'profile',
    loadComponent: () => import('./pages/profile.component').then((m) => m.ProfileComponent),
    title: 'Profile — ValueLabs Aide Autonomy',
    canActivate: [authGuard],
  },

  // Backwards-compatible redirects from the old static file names.
  { path: 'index.html', redirectTo: '', pathMatch: 'full' },
  { path: 'about.html', redirectTo: 'about', pathMatch: 'full' },
  { path: 'signup.html', redirectTo: 'signup', pathMatch: 'full' },
  { path: 'login.html', redirectTo: 'login', pathMatch: 'full' },
  { path: 'dashboard.html', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'profile.html', redirectTo: 'profile', pathMatch: 'full' },

  // 404 — show a proper Not Found page instead of silently redirecting to home.
  {
    path: '**',
    loadComponent: () =>
      import('./pages/not-found.component').then((m) => m.NotFoundComponent),
    title: 'Page not found — ValueLabs Aide Autonomy',
  },
];
