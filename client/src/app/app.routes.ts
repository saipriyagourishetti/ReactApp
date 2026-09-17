import { Routes } from '@angular/router';

/**
 * One route per page that used to be a separate .html file in public/.
 * All pages are lazily loaded so the initial bundle stays small.
 *
 * Legacy ".html" URLs are redirected so existing links keep working.
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
  },
  {
    path: 'profile',
    loadComponent: () => import('./pages/profile.component').then((m) => m.ProfileComponent),
    title: 'Profile — ValueLabs Aide Autonomy',
  },

  // Backwards-compatible redirects from the old static file names.
  { path: 'index.html', redirectTo: '', pathMatch: 'full' },
  { path: 'about.html', redirectTo: 'about', pathMatch: 'full' },
  { path: 'signup.html', redirectTo: 'signup', pathMatch: 'full' },
  { path: 'login.html', redirectTo: 'login', pathMatch: 'full' },
  { path: 'dashboard.html', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'profile.html', redirectTo: 'profile', pathMatch: 'full' },

  { path: '**', redirectTo: '' },
];
