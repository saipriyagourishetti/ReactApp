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
  /** Optional display name set via PATCH /api/users/:id */
  displayName?: string;
  /** Short bio set via PATCH /api/users/:id (max 280 chars) */
  bio?: string;
  /** Notification preferences set via PATCH /api/users/:id */
  notifications?: {
    emailAlerts?: boolean;
    weeklyDigest?: boolean;
    securityAlerts?: boolean;
  };
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

/** Response body for GET /api/me */
export interface MeResponse {
  user: User;
  session: SessionPublic;
}

/** Public session object (no token) returned by the API */
export interface SessionPublic {
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  /** Only present in GET /api/sessions list */
  userAgent?: string;
  ip?: string;
  current?: boolean;
}

/** Response body for GET /api/sessions */
export interface SessionsResponse {
  count: number;
  sessions: SessionPublic[];
}

/** Response body for GET /api/health */
export interface HealthResponse {
  status: string;
  uptimeSeconds: number;
  users: number;
  sessions: number;
  node: string;
}

/** Payload for PATCH /api/users/:id */
export interface UpdateProfilePayload {
  displayName?: string;
  bio?: string;
  notifications?: {
    emailAlerts?: boolean;
    weeklyDigest?: boolean;
    securityAlerts?: boolean;
  };
}

/** Payload for POST /api/password */
export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}
