import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { ApiError, ApiService } from '../core/api.service';
import { ToastService } from '../core/toast.service';
import { emailFormat } from '../core/validators';
import { RevealDirective } from '../shared/reveal.directive';
import { SiteHeaderComponent } from '../shared/site-header.component';

type StatusKind = 'success' | 'failure' | '';

const DEMO_EMAIL = 'ada@example.com';
const DEMO_PASSWORD = 'analytical1';

/**
 * Login page — the Reactive Forms replacement for `initLogin` in
 * public/app.js, including the "Fill the form" demo shortcut and the
 * copy-to-clipboard button from `initCopy` in ui.js.
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, SiteHeaderComponent, RevealDirective],
  host: { class: 'auth-body' },
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  readonly demoEmail = DEMO_EMAIL;
  readonly demoPassword = DEMO_PASSWORD;

  readonly submitting = signal(false);
  readonly status = signal<{ message: string; kind: StatusKind }>({ message: '', kind: '' });
  readonly showPassword = signal(false);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, emailFormat]],
    password: ['', [Validators.required]],
  });

  control(name: keyof typeof this.form.controls): FormControl {
    return this.form.controls[name] as FormControl;
  }

  showError(name: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  errorFor(name: keyof typeof this.form.controls): string {
    if (!this.showError(name)) return '';
    const server = this.form.controls[name].errors?.['server'];
    if (server) return server;
    return name === 'email'
      ? 'Enter a valid email address.'
      : 'Please enter your password.';
  }

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  fillDemo(): void {
    this.form.setValue({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
    this.status.set({ message: '', kind: '' });
    this.toast.info('Demo credentials filled in.');
  }

  async copyEmail(): Promise<void> {
    try {
      await navigator.clipboard.writeText(DEMO_EMAIL);
      this.toast.success('Copied to clipboard', 1800);
    } catch {
      this.toast.warning('Could not copy — please select the text manually.');
    }
  }

  submit(): void {
    this.status.set({ message: '', kind: '' });

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.status.set({ message: 'Please fix the highlighted fields.', kind: 'failure' });
      this.toast.warning('Please fix the highlighted fields.');
      return;
    }

    const { email, password } = this.form.getRawValue();
    this.submitting.set(true);

    this.api.login({ email: email.trim(), password }).subscribe({
      next: ({ user }) => {
        this.submitting.set(false);
        this.form.reset();
        this.status.set({
          message: `Logged in as ${user.name} (${user.role}).`,
          kind: 'success',
        });
        this.toast.success(`Welcome back, ${user.name}!`);
      },
      error: (err: ApiError) => {
        this.submitting.set(false);

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
