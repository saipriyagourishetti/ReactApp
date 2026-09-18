import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { User } from './models';

const SESSION_KEY = 'dp-current-user';

/**
 * Provides authentication state across the app as an Angular signal.
 *
 * - `currentUser` is persisted to `sessionStorage` so a page refresh does not
 *   require the user to log in again within the same browser tab.
 * - `isLoggedIn` is a derived computed signal — components should prefer it
 *   for guards and conditional rendering.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly router = inject(Router);

  private readonly _currentUser = signal<User | null>(this.rehydrate());

  /** The currently authenticated user, or `null` if not logged in. */
  readonly currentUser = this._currentUser.asReadonly();

  /** `true` when a user is authenticated. */
  readonly isLoggedIn = computed(() => this._currentUser() !== null);

  /**
   * Store the user in the signal and in `sessionStorage`.
   * Call after a successful login or signup API response.
   */
  setUser(user: User): void {
    this._currentUser.set(user);
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
    } catch {
      // sessionStorage may be unavailable in some browser contexts.
    }
  }

  /**
   * Clear authentication state and navigate to the login page.
   */
  logout(): void {
    this._currentUser.set(null);
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // Ignore storage errors.
    }
    this.router.navigate(['/login']);
  }

  /** Read back a previously stored user from `sessionStorage`. */
  private rehydrate(): User | null {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  }
}
