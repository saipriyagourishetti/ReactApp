/**
 * Password strength scoring, ported verbatim in behaviour from
 * `scorePassword` in public/ui.js.
 */

export type StrengthLevel = 'empty' | 'weak' | 'fair' | 'good' | 'strong';

export interface StrengthResult {
  score: number;
  level: StrengthLevel;
  label: string;
}

const STRENGTH_LEVELS: { level: StrengthLevel; label: string }[] = [
  { level: 'empty', label: 'Enter a password' },
  { level: 'weak', label: 'Weak' },
  { level: 'fair', label: 'Fair' },
  { level: 'good', label: 'Good' },
  { level: 'strong', label: 'Strong' },
];

export function scorePassword(password: string): StrengthResult {
  if (!password) {
    return { score: 0, level: 'empty', label: STRENGTH_LEVELS[0].label };
  }

  let points = 0;
  if (password.length >= 8) points += 1;
  if (password.length >= 12) points += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) points += 1;
  if (/\d/.test(password)) points += 1;
  if (/[^A-Za-z0-9]/.test(password)) points += 1;
  if (password.length < 8) points = Math.min(points, 1);

  const score = Math.max(1, Math.min(4, Math.ceil(points * 0.8)));
  return { score, level: STRENGTH_LEVELS[score].level, label: STRENGTH_LEVELS[score].label };
}
