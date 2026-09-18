import { FormControl, FormGroup } from '@angular/forms';

import { emailFormat, passwordComplexity, trimmedMinLength, passwordsMatch } from './validators';

// ── emailFormat ───────────────────────────────────────────────────────────────

describe('emailFormat validator', () => {
  function ctrl(value: string) {
    return new FormControl(value);
  }

  it('passes for a valid email', () => {
    expect(emailFormat(ctrl('ada@example.com'))).toBeNull();
  });

  it('passes for empty string (not required by this validator)', () => {
    expect(emailFormat(ctrl(''))).toBeNull();
  });

  it('fails without @', () => {
    expect(emailFormat(ctrl('notanemail'))).toEqual({ emailFormat: true });
  });

  it('fails without a dot in domain', () => {
    expect(emailFormat(ctrl('ada@localhost'))).toEqual({ emailFormat: true });
  });

  it('fails with spaces', () => {
    expect(emailFormat(ctrl('ada @example.com'))).toEqual({ emailFormat: true });
  });

  it('passes for subdomain emails', () => {
    expect(emailFormat(ctrl('user@mail.example.org'))).toBeNull();
  });
});

// ── passwordComplexity ────────────────────────────────────────────────────────

describe('passwordComplexity validator', () => {
  function ctrl(value: string) {
    return new FormControl(value);
  }

  it('passes for empty (defers to required validator)', () => {
    expect(passwordComplexity(ctrl(''))).toBeNull();
  });

  it('passes when has letter and digit', () => {
    expect(passwordComplexity(ctrl('abc123'))).toBeNull();
  });

  it('fails with only letters', () => {
    expect(passwordComplexity(ctrl('abcdefgh'))).toEqual({ passwordComplexity: true });
  });

  it('fails with only numbers', () => {
    expect(passwordComplexity(ctrl('12345678'))).toEqual({ passwordComplexity: true });
  });

  it('passes with uppercase letters and digits', () => {
    expect(passwordComplexity(ctrl('Secure1'))).toBeNull();
  });
});

// ── trimmedMinLength ──────────────────────────────────────────────────────────

describe('trimmedMinLength validator', () => {
  it('passes when trimmed length meets minimum', () => {
    const v = trimmedMinLength(2)(new FormControl('ab'));
    expect(v).toBeNull();
  });

  it('fails when trimmed length is below minimum', () => {
    const v = trimmedMinLength(3)(new FormControl('ab'));
    expect(v).toEqual({ trimmedMinLength: { min: 3, actual: 2 } });
  });

  it('fails when value is only whitespace (trims to empty)', () => {
    // empty after trim → returns null (defers to required)
    const v = trimmedMinLength(2)(new FormControl('   '));
    expect(v).toBeNull();
  });

  it('trims surrounding whitespace before checking length', () => {
    // "  a  " trims to "a" (length 1), should fail min=2
    const v = trimmedMinLength(2)(new FormControl('  a  '));
    expect(v).toEqual({ trimmedMinLength: { min: 2, actual: 1 } });
  });

  it('passes for null value (defers to required)', () => {
    const v = trimmedMinLength(2)(new FormControl(null));
    expect(v).toBeNull();
  });
});

// ── passwordsMatch ────────────────────────────────────────────────────────────

describe('passwordsMatch validator', () => {
  function makeGroup(password: string, confirm: string) {
    return new FormGroup({
      password: new FormControl(password),
      confirm: new FormControl(confirm),
    });
  }

  it('returns null when passwords match', () => {
    const group = makeGroup('secret1', 'secret1');
    const result = passwordsMatch('password', 'confirm')(group);
    expect(result).toBeNull();
  });

  it('returns null when confirm is empty (not yet entered)', () => {
    const group = makeGroup('secret1', '');
    const result = passwordsMatch('password', 'confirm')(group);
    expect(result).toBeNull();
  });

  it('returns { passwordsMatch: true } when passwords differ', () => {
    const group = makeGroup('secret1', 'different');
    const result = passwordsMatch('password', 'confirm')(group);
    expect(result).toEqual({ passwordsMatch: true });
  });

  it('sets error on confirm control when passwords differ', () => {
    const group = makeGroup('secret1', 'different');
    passwordsMatch('password', 'confirm')(group);
    expect(group.controls['confirm'].hasError('passwordsMatch')).toBe(true);
  });

  it('clears passwordsMatch error from confirm when passwords match again', () => {
    const group = makeGroup('secret1', 'different');
    const validator = passwordsMatch('password', 'confirm');
    validator(group); // sets error
    group.controls['password'].setValue('different');
    group.controls['confirm'].setValue('different');
    validator(group); // should clear
    expect(group.controls['confirm'].hasError('passwordsMatch')).toBe(false);
  });

  it('returns null when password control is missing', () => {
    const group = new FormGroup({ confirm: new FormControl('abc') });
    const result = passwordsMatch('password', 'confirm')(group);
    expect(result).toBeNull();
  });
});
