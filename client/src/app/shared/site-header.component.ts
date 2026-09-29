import { Component, HostListener, Input, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { ThemeService } from '../core/theme.service';
import { ToastService } from '../core/toast.service';

/**
 * The site header that every page in public/*.html repeated by hand.
 *
 * Combines `initNav` (mobile toggle, close on link click / Escape / resize)
 * and the theme toggle button from public/ui.js.
 *
 * When `AuthService.currentUser()` is non-null the nav actions switch from
 * "Log in / Get started" to the user's name and a "Log out" button.
 */
@Component({
  selector: 'app-site-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header class="site-header" [class.nav-open]="open()">
      <nav class="nav container">
        <a class="brand" routerLink="/">
          <span class="brand-mark">◆</span>
          <span>ValueLabs Aide Autonomy</span>
        </a>

        <ul class="nav-links" id="nav-links">
          <li><a routerLink="/about" routerLinkActive="is-active" (click)="close()">About</a></li>
          <li>
            <a routerLink="/dashboard" routerLinkActive="is-active" (click)="close()">Dashboard</a>
          </li>
          <li><a routerLink="/" fragment="features" (click)="close()">Features</a></li>
          <li><a routerLink="/" fragment="pricing" (click)="close()">Pricing</a></li>
        </ul>

        <div class="nav-actions">
          <button
            class="icon-btn nav-toggle hamburger"
            type="button"
            aria-controls="nav-links"
            [attr.aria-expanded]="open()"
            aria-label="Toggle navigation menu"
            (click)="toggle()"
          >
            <span></span><span></span><span></span>
          </button>

          <button
            class="icon-btn"
            type="button"
            [attr.aria-pressed]="theme.theme() === 'light'"
            [attr.aria-label]="
              'Switch to ' + (theme.theme() === 'light' ? 'dark' : 'light') + ' theme'
            "
            (click)="theme.toggle()"
          >
            <span aria-hidden="true">{{ theme.theme() === 'light' ? '🌙' : '☀' }}</span>
          </button>

          @if (auth.currentUser(); as user) {
            <!-- Authenticated: show user name + logout -->
            <a class="btn btn-ghost btn-sm" routerLink="/profile" (click)="close()">
              {{ user.displayName || user.name }}
            </a>
            <button
              class="btn btn-primary btn-sm"
              type="button"
              [disabled]="loggingOut()"
              (click)="logout()"
            >
              {{ loggingOut() ? 'Logging out…' : 'Log out' }}
            </button>
          } @else {
            <!-- Guest: show login / signup links -->
            @if (showLogin) {
              <a class="btn btn-ghost btn-sm" routerLink="/login" (click)="close()">Log in</a>
            }
            @if (showSignup) {
              <a class="btn btn-primary btn-sm" routerLink="/signup" (click)="close()">
                {{ signupLabel }}
              </a>
            }
          }
        </div>
      </nav>
    </header>
  `,
})
export class SiteHeaderComponent {
  @Input() showLogin = true;
  @Input() showSignup = true;
  @Input() signupLabel = 'Get started';

  readonly theme = inject(ThemeService);
  readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly open = signal(false);
  readonly loggingOut = signal(false);

  toggle(): void {
    this.open.update((v) => !v);
  }

  close(): void {
    this.open.set(false);
  }

  logout(): void {
    this.loggingOut.set(true);
    this.api.logout().subscribe({
      next: () => {
        this.auth.clear();
        this.loggingOut.set(false);
        this.close();
        this.toast.success('You have been logged out.');
        void this.router.navigate(['/']);
      },
      error: () => {
        // Even on error we clear local state — the cookie is probably gone.
        this.auth.clear();
        this.loggingOut.set(false);
        this.close();
        void this.router.navigate(['/']);
      },
    });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }

  @HostListener('window:resize')
  onResize(): void {
    if (window.innerWidth > 860) this.close();
  }
}
