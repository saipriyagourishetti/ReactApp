import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: number;
  message: string;
  kind: ToastKind;
}

export const TOAST_ICONS: Record<ToastKind, string> = {
  success: '✓',
  error: '✕',
  warning: '!',
  info: 'i',
};

const DEFAULT_TIMEOUT = 4500;

/**
 * Replacement for `window.UI.toast` from public/ui.js.
 *
 * Instead of creating DOM nodes imperatively, toasts are held in a signal and
 * rendered by ToastHostComponent.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();

  /** Read-only view consumed by the toast host template. */
  readonly toasts = signal<Toast[]>([]);

  show(message: string, kind: ToastKind = 'info', timeout = DEFAULT_TIMEOUT): number | null {
    if (!message) return null;

    const id = this.nextId++;
    this.toasts.update((list) => [...list, { id, message, kind }]);
    this.timers.set(
      id,
      setTimeout(() => this.dismiss(id), timeout)
    );
    return id;
  }

  success(message: string, timeout?: number) {
    return this.show(message, 'success', timeout);
  }

  error(message: string, timeout?: number) {
    return this.show(message, 'error', timeout);
  }

  warning(message: string, timeout?: number) {
    return this.show(message, 'warning', timeout);
  }

  info(message: string, timeout?: number) {
    return this.show(message, 'info', timeout);
  }

  dismiss(id: number): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }
}
