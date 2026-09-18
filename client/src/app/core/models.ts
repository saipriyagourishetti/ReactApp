/**
 * Shapes returned by the Node API in ../../src/server.js.
 */

export type UserRole = 'user' | 'editor' | 'admin';

/** Public user record produced by `UserStore.toPublic`. */
export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
  hasPassword: boolean;
  /** Optional display name distinct from the account `name` field. */
  displayName?: string;
  /** Optional short biography shown on the profile page. */
  bio?: string;
}

/** Successful response body for /api/signup and /api/login. */
export interface AuthResponse {
  user: User;
}

/**
 * Error body for a failed API call. `field` names the offending control so the
 * form can attach a server-side error to the right input.
 */
export interface ApiErrorBody {
  error: string;
  field?: string;
}

export interface SignupPayload {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface LoginPayload {
  email: string;
  password: string;
}

/** Payload for PUT /api/profile */
export interface ProfilePayload {
  email: string;
  displayName: string;
  bio: string;
}

/** Payload for POST /api/change-password */
export interface ChangePasswordPayload {
  email: string;
  currentPassword: string;
  newPassword: string;
}
