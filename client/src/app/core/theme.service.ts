import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

const THEME_KEY = 'dp-theme';

/**
 * Dark/light theme handling ported from public/ui.js.
 *
 * The initial attribute is still applied by the inline script in index.html to
 * avoid a flash of the wrong colours before Angular boots; this service reads
 * that value back and owns all later changes.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  readonly theme = signal<Theme>('dark');

  constructor() {
    this.theme.set(this.initialTheme());
    this.apply(this.theme());
  }

  toggle(): Theme {
    const next: Theme = this.theme() === 'light' ? 'dark' : 'light';
    this.set(next);
    return next;
  }

  set(theme: Theme): void {
    this.theme.set(theme);
    this.apply(theme);
    this.persist(theme);
  }

  private apply(theme: Theme): void {
    this.document.documentElement.setAttribute('data-theme', theme);
  }

  private initialTheme(): Theme {
    const current = this.document.documentElement.getAttribute('data-theme');
    if (current === 'light' || current === 'dark') return current;

    const saved = this.read();
    if (saved) return saved;

    const win = this.document.defaultView;
    return win?.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  private read(): Theme | null {
    try {
      const value = this.document.defaultView?.localStorage.getItem(THEME_KEY);
      return value === 'light' || value === 'dark' ? value : null;
    } catch {
      return null;
    }
  }

  private persist(theme: Theme): void {
    try {
      this.document.defaultView?.localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* storage unavailable — theme stays for this session only */
    }
  }
}
