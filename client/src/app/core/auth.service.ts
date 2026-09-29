import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, of, tap } from 'rxjs';

import { ApiService } from './api.service';
import { User } from './models';

/**
 * Centralised authentication state for the Angular SPA.
 *
 * Wraps GET /api/me to establish whether a session cookie is active, then
 * exposes the resolved user via a signal so any component can react to
 * auth state changes without prop-drilling.
 *
 * Design decisions:
 * - No local storage / token storage — the browser cookie is the source of truth.
 * - `loadCurrentUser()` is called once at app bootstrap via APP_INITIALIZER in
 *   app.config.ts and then again after any login/logout action.
 * - `clear()` discards the in-memory user without hitting the server (the
 *   calling code is responsible for POSTing /api/logout first).
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);

  /** The authenticated user, or `null` when no valid session is present. */
  readonly currentUser = signal<User | null>(null);

  /**
   * Resolves the current session via GET /api/me and stores the result.
   * Silently treats any error (401, network) as "not logged in".
   *
   * Returns an Observable so APP_INITIALIZER can await it.
   */
  loadCurrentUser(): Observable<User | null> {
    return this.api.me().pipe(
      tap(({ user }) => this.currentUser.set(user)),
      // Any error means no valid session — set null and continue normally.
      catchError(() => {
        this.currentUser.set(null);
        return of(null);
      })
    ) as Observable<User | null>;
  }

  /**
   * Discard the in-memory session state.
   * Call this after a successful POST /api/logout.
   */
  clear(): void {
    this.currentUser.set(null);
  }

  /** Convenience: is the user currently authenticated? */
  get isAuthenticated(): boolean {
    return this.currentUser() !== null;
  }
}
