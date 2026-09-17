import { NgClass } from '@angular/common';
import { Component, inject } from '@angular/core';

import { TOAST_ICONS, ToastKind, ToastService } from '../core/toast.service';

/**
 * Renders the toast stack. Mounted once in AppComponent, replacing the
 * dynamically created `.toast-host` element from public/ui.js.
 */
@Component({
  selector: 'app-toast-host',
  standalone: true,
  imports: [NgClass],
  template: `
    <div class="toast-host" role="region" aria-label="Notifications" aria-live="polite">
      @for (toast of toasts(); track toast.id) {
        <div class="toast is-in" [ngClass]="'toast-' + toast.kind">
          <span class="toast-icon" aria-hidden="true">{{ icon(toast.kind) }}</span>
          <p class="toast-msg">{{ toast.message }}</p>
          <button
            type="button"
            class="toast-close"
            aria-label="Dismiss notification"
            (click)="dismiss(toast.id)"
          >
            ×
          </button>
        </div>
      }
    </div>
  `,
})
export class ToastHostComponent {
  private readonly service = inject(ToastService);
  readonly toasts = this.service.toasts;

  icon(kind: ToastKind): string {
    return TOAST_ICONS[kind] ?? TOAST_ICONS.info;
  }

  dismiss(id: number): void {
    this.service.dismiss(id);
  }
}
