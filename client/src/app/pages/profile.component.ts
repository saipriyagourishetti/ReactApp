import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { ApiError, ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { passwordComplexity, passwordsMatch } from '../core/validators';
import { ToastService } from '../core/toast.service';
import { SiteFooterComponent } from '../shared/site-footer.component';
import { SiteHeaderComponent } from '../shared/site-header.component';

/**
 * Profile page — now backed by a real PUT /api/profile endpoint.
 *
 * - Form fields are pre-populated from `AuthService.currentUser()`.
 * - Saving calls `ApiService.updateProfile()` and syncs the signal on success.
 * - A collapsible "Change Password" section lets users update their password
 *   without a separate page.
 * - A "Log out" button is provided to clear authentication state.
 */
@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, SiteHeaderComponent, SiteFooterComponent],
  host: { class: 'auth-body' },
  templateUrl: './profile.component.html',
})
export class ProfileComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly saving = signal(false);
  readonly status = signal('');

  /** Controls visibility of the Change Password form. */
  readonly showPasswordForm = signal(false);
  readonly changingPassword = signal(false);
  readonly passwordStatus = signal('');
  readonly showCurrentPw = signal(false);
  readonly showNewPw = signal(false);
  readonly showConfirmPw = signal(false);

  readonly form = this.fb.nonNullable.group({
    displayName: ['', [Validators.required, Validators.minLength(2)]],
    email: [{ value: '', disabled: true }],
    bio: ['', [Validators.maxLength(280)]],
    role: [{ value: '', disabled: true }],
    emailAlerts: [true],
    weeklyDigest: [false],
    securityAlerts: [true],
  });

  readonly passwordForm = this.fb.nonNullable.group(
    {
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(8), passwordComplexity]],
      confirmNewPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatch('newPassword', 'confirmNewPassword') }
  );

  readonly stats = [
    { value: '12', label: 'Sessions', color: 'var(--accent)' },
    { value: '4', label: 'Projects', color: 'var(--accent-2)' },
    { value: '98', label: 'Requests', color: 'var(--accent-3)' },
  ];

  get displayNameInvalid(): boolean {
    const c = this.form.controls.displayName;
    return c.invalid && (c.touched || c.dirty);
  }

  ngOnInit(): void {
    const user = this.auth.currentUser();
    if (user) {
      this.form.patchValue({
        displayName: user.displayName ?? user.name,
        email: user.email,
        bio: user.bio ?? '',
        role: user.role,
      });
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.warning('Please fix the highlighted fields.');
      return;
    }

    const user = this.auth.currentUser();
    if (!user) {
      this.toast.error('You are not logged in.');
      return;
    }

    this.saving.set(true);
    this.status.set('');

    const { displayName, bio } = this.form.getRawValue();

    this.api.updateProfile({ email: user.email, displayName, bio }).subscribe({
      next: ({ user: updatedUser }) => {
        this.saving.set(false);
        this.auth.setUser(updatedUser);
        this.status.set('Profile updated successfully.');
        this.toast.success('Profile saved.');
      },
      error: (err: ApiError) => {
        this.saving.set(false);
        this.status.set(err.message);
        this.toast.error(err.message);
      },
    });
  }

  togglePasswordForm(): void {
    this.showPasswordForm.update((v) => !v);
    this.passwordStatus.set('');
    this.passwordForm.reset();
  }

  submitPasswordChange(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      this.toast.warning('Please fix the highlighted fields.');
      return;
    }

    const user = this.auth.currentUser();
    if (!user) {
      this.toast.error('You are not logged in.');
      return;
    }

    this.changingPassword.set(true);
    this.passwordStatus.set('');

    const { currentPassword, newPassword } = this.passwordForm.getRawValue();

    this.api.changePassword({ email: user.email, currentPassword, newPassword }).subscribe({
      next: () => {
        this.changingPassword.set(false);
        this.passwordStatus.set('Password changed successfully.');
        this.toast.success('Password updated.');
        this.passwordForm.reset();
        this.showPasswordForm.set(false);
      },
      error: (err: ApiError) => {
        this.changingPassword.set(false);
        if (err.field === 'currentPassword') {
          this.passwordForm.controls.currentPassword.setErrors({ server: err.message });
          this.passwordForm.controls.currentPassword.markAsTouched();
        }
        this.passwordStatus.set(err.message);
        this.toast.error(err.message);
      },
    });
  }

  logout(): void {
    this.auth.logout();
  }

  passwordErrorFor(name: 'currentPassword' | 'newPassword' | 'confirmNewPassword'): string {
    const c = this.passwordForm.controls[name];
    if (c.valid || (!c.touched && !c.dirty)) return '';
    const e = c.errors ?? {};
    if (e['server']) return e['server'];
    switch (name) {
      case 'currentPassword':
        return 'Please enter your current password.';
      case 'newPassword':
        if (e['required'] || e['minlength']) return 'Password must be at least 8 characters.';
        if (e['passwordComplexity']) return 'Include at least one letter and one number.';
        return '';
      case 'confirmNewPassword':
        if (e['passwordsMatch']) return 'Passwords do not match.';
        return 'Please confirm your new password.';
      default:
        return '';
    }
  }
}
