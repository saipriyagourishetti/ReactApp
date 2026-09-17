import { Component, inject, signal } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';

import { ApiError, ApiService } from '../core/api.service';
import { UserRole } from '../core/models';
import { scorePassword } from '../core/password-strength';
import { ToastService } from '../core/toast.service';
import {
  emailFormat,
  passwordComplexity,
  passwordsMatch,
  trimmedMinLength,
} from '../core/validators';
import { RevealDirective } from '../shared/reveal.directive';
import { SiteHeaderComponent } from '../shared/site-header.component';

type StatusKind = 'success' | 'failure' | '';

/**
 * Signup page — the Reactive Forms replacement for `initSignup` in
 * public/app.js.
 *
 * Validation rules are unchanged from the original imperative `validate()`
 * function; they are just expressed declaratively now.
 */
@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, SiteHeaderComponent, RevealDirective],
  host: { class: 'auth-body' },
  templateUrl: './signup.component.html',
})
export class SignupComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  readonly submitting = signal(false);
  readonly status = signal<{ message: string; kind: StatusKind }>({ message: '', kind: '' });
  readonly showPassword = signal(false);
  readonly showConfirm = signal(false);

  readonly form = this.fb.nonNullable.group(
    {
      name: ['', [Validators.required, trimmedMinLength(2)]],
      email: ['', [Validators.required, emailFormat]],
      password: ['', [Validators.required, Validators.minLength(8), passwordComplexity]],
      confirm: ['', [Validators.required]],
      role: ['user' as UserRole],
      terms: [false, [Validators.requiredTrue]],
    },
    { validators: passwordsMatch('password', 'confirm') }
  );

  /** Drives the strength meter, replacing the `input` listener in ui.js. */
  private readonly passwordValue = toSignal(this.form.controls.password.valueChanges, {
    initialValue: '',
  });
  readonly strength = () => scorePassword(this.passwordValue());

  control(name: keyof typeof this.form.controls): FormControl {
    return this.form.controls[name] as FormControl;
  }

  /** Show an error only once the user has interacted, as the original did. */
  showError(name: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  errorFor(name: keyof typeof this.form.controls): string {
    const c = this.form.controls[name];
    if (!this.showError(name)) return '';
    const e = c.errors ?? {};

    switch (name) {
      case 'name':
        return 'Please enter your full name (at least 2 characters).';
      case 'email':
        return 'Enter a valid email address, e.g. ada@example.com.';
      case 'password':
        if (e['required'] || e['minlength']) {
          return 'Password must be at least 8 characters long.';
        }
        if (e['passwordComplexity']) return 'Include at least one letter and one number.';
        return c.errors?.['server'] ?? '';
      case 'confirm':
        if (e['passwordsMatch']) return 'Passwords do not match.';
        return 'Please confirm your password.';
      case 'terms':
        return 'You must accept the terms to continue.';
      default:
        return '';
    }
  }

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  toggleConfirm(): void {
    this.showConfirm.update((v) => !v);
  }

  submit(): void {
    this.status.set({ message: '', kind: '' });

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.status.set({ message: 'Please fix the highlighted fields.', kind: 'failure' });
      this.toast.warning('Please fix the highlighted fields.');
      return;
    }

    const { name, email, password, role } = this.form.getRawValue();
    this.submitting.set(true);

    this.api
      .signup({ name: name.trim(), email: email.trim(), password, role })
      .subscribe({
        next: ({ user }) => {
          this.submitting.set(false);
          this.form.reset({ role: 'user', terms: false });
          this.status.set({
            message: `Welcome, ${user.name}! Your account (#${user.id}) is ready. You can now log in.`,
            kind: 'success',
          });
          this.toast.success(`Account created — welcome, ${user.name}!`);
        },
        error: (err: ApiError) => {
          this.submitting.set(false);

          // Re-attach a server-side field error to the matching control.
          if (err.field && err.field in this.form.controls) {
            const control = this.form.get(err.field);
            control?.setErrors({ ...(control.errors ?? {}), server: err.message });
            control?.markAsTouched();
          }

          this.status.set({ message: err.message, kind: 'failure' });
          this.toast.error(err.message);
        },
      });
  }
}
