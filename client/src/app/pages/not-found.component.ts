import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { SiteFooterComponent } from '../shared/site-footer.component';
import { SiteHeaderComponent } from '../shared/site-header.component';

/**
 * 404 Not Found page.
 *
 * Replaces the previous wildcard route that silently redirected to the home
 * page, which was confusing for users who bookmarked a bad URL or followed a
 * stale link.
 */
@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink, SiteHeaderComponent, SiteFooterComponent],
  template: `
    <app-site-header />

    <main class="auth-main" id="main">
      <div class="container" style="text-align: center; padding: 80px 24px">
        <p class="eyebrow" style="margin-bottom: 12px">Error 404</p>
        <h1 style="font-size: clamp(2rem, 6vw, 4rem); margin: 0 0 16px">Page not found</h1>
        <p style="color: var(--muted); max-width: 480px; margin: 0 auto 36px; font-size: 1.1rem">
          The page you're looking for doesn't exist or may have been moved.
        </p>
        <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap">
          <a class="btn btn-primary" routerLink="/">Go to home</a>
          <a class="btn btn-ghost" routerLink="/dashboard">Dashboard</a>
        </div>
      </div>
    </main>

    <app-site-footer />
  `,
})
export class NotFoundComponent {}
