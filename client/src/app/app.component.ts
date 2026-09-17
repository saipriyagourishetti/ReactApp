import { Component, HostListener, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { ToastHostComponent } from './shared/toast-host.component';

/**
 * Application shell.
 *
 * Owns the cross-page chrome that public/ui.js attached to every document:
 * the scroll progress bar, the back-to-top button and the toast host.
 * Page-specific headers/footers are rendered by the routed components, since
 * the dashboard uses a sidebar layout instead of the standard header.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastHostComponent],
  template: `
    <a class="skip-link" href="#main">Skip to content</a>

    <div class="scroll-progress" aria-hidden="true" [style.width.%]="progress()"></div>

    <router-outlet />

    <button
      type="button"
      class="back-to-top"
      [class.is-visible]="showTop()"
      aria-label="Back to top"
      (click)="scrollTop()"
    >
      ↑
    </button>

    <app-toast-host />
  `,
})
export class AppComponent {
  readonly progress = signal(0);
  readonly showTop = signal(false);

  @HostListener('window:scroll')
  onScroll(): void {
    const scrolled = window.scrollY || window.pageYOffset;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    this.progress.set(max > 0 ? Math.min(100, (scrolled / max) * 100) : 0);
    this.showTop.set(scrolled > 420);
  }

  scrollTop(): void {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  }
}
