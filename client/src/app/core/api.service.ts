import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';

import {
  ApiErrorBody,
  AuthResponse,
  ChangePasswordPayload,
  HealthResponse,
  LoginPayload,
  MeResponse,
  SessionsResponse,
  SignupPayload,
  UpdateProfilePayload,
  User,
} from './models';

/**
 * A typed error carrying the API's `field` hint so components can map a
 * server-side failure back onto a specific form control.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly field?: string,
    readonly status?: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const NETWORK_MESSAGE = 'Network error — is the server running? (npm start)';

/**
 * Replaces the hand-rolled `postJson` helper from public/app.js.
 *
 * Requests go to relative /api/* URLs; `proxy.conf.json` forwards them to the
 * Node server on :3000 during development.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  signup(payload: SignupPayload): Observable<AuthResponse> {
    return this.post<AuthResponse>('/api/signup', payload);
  }

  login(payload: LoginPayload): Observable<AuthResponse> {
    return this.post<AuthResponse>('/api/login', payload);
  }

  logout(): Observable<{ ok: boolean; destroyed: boolean }> {
    return this.post<{ ok: boolean; destroyed: boolean }>('/api/logout', {});
  }

  me(): Observable<MeResponse> {
    return this.http
      .get<MeResponse>('/api/me')
      .pipe(catchError((err: HttpErrorResponse) => throwError(() => this.toApiError(err))));
  }

  listUsers(): Observable<{ count: number; users: User[] }> {
    return this.http
      .get<{ count: number; users: User[] }>('/api/users')
      .pipe(catchError((err: HttpErrorResponse) => throwError(() => this.toApiError(err))));
  }

  listSessions(): Observable<SessionsResponse> {
    return this.http
      .get<SessionsResponse>('/api/sessions')
      .pipe(catchError((err: HttpErrorResponse) => throwError(() => this.toApiError(err))));
  }

  health(): Observable<HealthResponse> {
    return this.http
      .get<HealthResponse>('/api/health')
      .pipe(catchError((err: HttpErrorResponse) => throwError(() => this.toApiError(err))));
  }

  changePassword(payload: ChangePasswordPayload): Observable<{ user: User; revokedSessions: number }> {
    return this.post<{ user: User; revokedSessions: number }>('/api/password', payload);
  }

  updateProfile(userId: number, payload: UpdateProfilePayload): Observable<{ user: User }> {
    return this.http
      .patch<{ user: User }>(`/api/users/${userId}`, payload)
      .pipe(catchError((err: HttpErrorResponse) => throwError(() => this.toApiError(err))));
  }

  private post<T>(url: string, body: unknown): Observable<T> {
    return this.http
      .post<T>(url, body)
      .pipe(catchError((err: HttpErrorResponse) => throwError(() => this.toApiError(err))));
  }

  /**
   * Normalise Angular's HttpErrorResponse into an ApiError.
   *
   * `status === 0` means the request never reached the server, which mirrors
   * the `catch` branch of the original fetch-based code.
   */
  private toApiError(err: HttpErrorResponse): ApiError {
    if (err.status === 0) {
      return new ApiError(NETWORK_MESSAGE, undefined, 0);
    }

    const body = err.error as ApiErrorBody | null;
    const message = body?.error ?? 'Request failed. Please try again.';
    return new ApiError(message, body?.field, err.status);
  }
}
