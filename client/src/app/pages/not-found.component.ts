import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { RevealDirective } from '../shared/reveal.directive';
import { SiteFooterComponent } from '../shared/site-footer.component';
import { SiteHeaderComponent } from '../shared/site-header.component';

/**
 * 404 Not-Found page.
 *
 * Replaces the silent redirect-to-home that the wildcard route previously used.
 * Uses the standard site chrome so it looks consistent with the rest of the app.
 */
@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink, SiteHeaderComponent, SiteFooterComponent, RevealDirective],
  host: { class: 'auth-body' },
  template: `
    <app-site-header />

    <main class="auth-main" id="main">
      <div class="container" style="text-align: center; padding: 80px 24px">
        <div appReveal>
          <p
            class="eyebrow"
            style="margin-bottom: 16px; letter-spacing: 0.1em"
          >
            Error 404
          </p>

          <h1
            style="
              font-size: clamp(5rem, 18vw, 10rem);
              font-weight: 800;
              margin: 0;
              line-height: 1;
              background: linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              background-clip: text;
            "
          >
            404
          </h1>

          <h2
            style="
              font-size: clamp(1.4rem, 3vw, 2rem);
              margin: 16px 0 12px;
              font-weight: 600;
            "
          >
            Page not found
          </h2>

          <p style="color: var(--muted); max-width: 420px; margin: 0 auto 40px">
            The page you're looking for doesn't exist or may have been moved.
            Check the URL or head back to safety.
          </p>

          <div style="display: flex; gap: 14px; justify-content: center; flex-wrap: wrap">
            <a class="btn btn-primary btn-lg" routerLink="/">Back to home</a>
            <a class="btn btn-ghost btn-lg" routerLink="/dashboard">Go to dashboard</a>
          </div>
        </div>
      </div>
    </main>

    <app-site-footer />
  `,
})
export class NotFoundComponent {}
