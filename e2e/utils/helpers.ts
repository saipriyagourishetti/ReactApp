/** Shared constants and small helpers for the e2e framework. */

export const BASE_URL: string = process.env.BASE_URL ?? 'http://localhost:4200';

/** Seeded demo account (see AGENTS.md). */
export const DEMO_USER = {
  email: process.env.DEMO_EMAIL ?? 'ada@example.com',
  password: process.env.DEMO_PASSWORD ?? 'analytical1',
} as const;

/** Read an environment variable, falling back to a default (or throwing if none). */
export function getEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/** Random alphanumeric string (lowercase). */
export function randomString(length = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < length; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

/** Unique throwaway email address. */
export function randomEmail(domain = 'example.com'): string {
  return `user-${Date.now()}-${randomString(5)}@${domain}`;
}

/** Promise-based delay. Prefer Playwright auto-waiting; use sparingly. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
