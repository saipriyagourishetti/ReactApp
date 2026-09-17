import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Same expression the vanilla app and the Node server both use. */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Email check matching the original regex rather than Angular's built-in
 * `Validators.email`, which accepts addresses the server would reject.
 */
export const emailFormat: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = (control.value ?? '') as string;
  if (!value) return null;
  return EMAIL_RE.test(value) ? null : { emailFormat: true };
};

/**
 * Enforces "at least one letter and one number", mirroring
 * `validatePassword` in src/userStore.js.
 */
export const passwordComplexity: ValidatorFn = (
  control: AbstractControl
): ValidationErrors | null => {
  const value = (control.value ?? '') as string;
  if (!value) return null;
  const ok = /[a-zA-Z]/.test(value) && /\d/.test(value);
  return ok ? null : { passwordComplexity: true };
};

/** Trimmed minimum length, so "  a  " does not pass a 2-character rule. */
export function trimmedMinLength(min: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = ((control.value ?? '') as string).trim();
    if (!value) return null;
    return value.length >= min ? null : { trimmedMinLength: { min, actual: value.length } };
  };
}

/**
 * Group-level validator that flags a mismatch on the confirmation control,
 * reproducing the `data.password !== data.confirm` check.
 */
export function passwordsMatch(passwordKey: string, confirmKey: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const password = group.get(passwordKey);
    const confirm = group.get(confirmKey);
    if (!password || !confirm) return null;

    if (!confirm.value) return null;

    if (password.value !== confirm.value) {
      // Surface the error on the confirm control so the template can show it
      // next to the right field, without clobbering other errors.
      const existing = confirm.errors ?? {};
      confirm.setErrors({ ...existing, passwordsMatch: true });
      return { passwordsMatch: true };
    }

    if (confirm.hasError('passwordsMatch')) {
      const { passwordsMatch: _removed, ...rest } = confirm.errors ?? {};
      confirm.setErrors(Object.keys(rest).length ? rest : null);
    }
    return null;
  };
}
