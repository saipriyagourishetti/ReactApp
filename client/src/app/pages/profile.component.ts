import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';

import { ApiError, ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { passwordComplexity } from '../core/validators';
import { ToastService } from '../core/toast.service';
import { SiteFooterComponent } from '../shared/site-footer.component';
import { SiteHeaderComponent } from '../shared/site-header.component';

type StatusKind = 'success' | 'failure' | '';

/**
 * Profile page — edit display name, bio, notification preferences, and
 * change password.
 *
 * On save, calls PATCH /api/users/:id with the changed profile fields.
 * The password change section calls POST /api/password.
 *
 * All data is pre-filled from `AuthService.currentUser()` which is resolved at
 * boot by APP_INITIALIZER, so no additional fetch is needed on page load.
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
  readonly status = signal<{ message: string; kind: StatusKind }>({ message: '', kind: '' });

  // Password change section state
  readonly changingPassword = signal(false);
  readonly pwStatus = signal<{ message: string; kind: StatusKind }>({ message: '', kind: '' });
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

  readonly pwForm = this.fb.nonNullable.group({
    currentPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(8), passwordComplexity]],
    confirmPassword: ['', [Validators.required]],
  });

  /** Character count for bio field */
  private readonly bioValue = toSignal(this.form.controls.bio.valueChanges, { initialValue: '' });
  readonly bioLength = computed(() => this.bioValue().length);

  readonly stats = signal([
    { value: '—', label: 'Sessions', color: 'var(--accent)' },
    { value: '—', label: 'Projects', color: 'var(--accent-2)' },
    { value: '—', label: 'Requests', color: 'var(--accent-3)' },
  ]);

  /** Avatar initials */
  readonly avatarInitials = computed(() => {
    const user = this.auth.currentUser();
    if (!user) return '?';
    const displayName = user.displayName || user.name;
    return displayName
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('');
  });

  get displayNameInvalid(): boolean {
    const c = this.form.controls.displayName;
    return c.invalid && (c.touched || c.dirty);
  }

  get bioInvalid(): boolean {
    const c = this.form.controls.bio;
    return c.invalid && (c.touched || c.dirty);
  }

  pwControl(name: keyof typeof this.pwForm.controls): FormControl {
    return this.pwForm.controls[name] as FormControl;
  }

  showPwError(name: keyof typeof this.pwForm.controls): boolean {
    const c = this.pwForm.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  ngOnInit(): void {
    const user = this.auth.currentUser();
    if (user) {
      this.form.patchValue({
        displayName: user.displayName || user.name,
        email: user.email,
        bio: user.bio ?? '',
        role: user.role,
        emailAlerts: user.notifications?.emailAlerts ?? true,
        weeklyDigest: user.notifications?.weeklyDigest ?? false,
        securityAlerts: user.notifications?.securityAlerts ?? true,
      });
    }

    // Load session count for profile stats.
    this.api.listSessions().subscribe({
      next: ({ count }) => {
        this.stats.update((s) => s.map((stat) => stat.label === 'Sessions' ? { ...stat, value: String(count) } : stat));
      },
      error: () => {},
    });
  }

  submit(): void {
    this.status.set({ message: '', kind: '' });

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.warning('Please fix the highlighted fields.');
      return;
    }

    const user = this.auth.currentUser();
    if (!user) return;

    const { displayName, bio, emailAlerts, weeklyDigest, securityAlerts } = this.form.getRawValue();
    this.saving.set(true);

    this.api
      .updateProfile(user.id, {
        displayName: displayName.trim(),
        bio,
        notifications: { emailAlerts, weeklyDigest, securityAlerts },
      })
      .subscribe({
        next: ({ user: updated }) => {
          this.saving.set(false);
          // Keep shared auth state in sync with saved changes.
          this.auth.currentUser.set(updated);
          this.status.set({ message: 'Profile updated successfully.', kind: 'success' });
          this.toast.success('Profile saved.');
        },
        error: (err: ApiError) => {
          this.saving.set(false);
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

  submitPasswordChange(): void {
    this.pwStatus.set({ message: '', kind: '' });

    if (this.pwForm.invalid) {
      this.pwForm.markAllAsTouched();
      this.toast.warning('Please fix the highlighted fields.');
      return;
    }

    const { currentPassword, newPassword, confirmPassword } = this.pwForm.getRawValue();
    if (newPassword !== confirmPassword) {
      this.pwForm.controls.confirmPassword.setErrors({ mismatch: true });
      this.pwForm.controls.confirmPassword.markAsTouched();
      this.pwStatus.set({ message: 'New passwords do not match.', kind: 'failure' });
      return;
    }

    this.changingPassword.set(true);

    this.api.changePassword({ currentPassword, newPassword }).subscribe({
      next: () => {
        this.changingPassword.set(false);
        this.pwForm.reset();
        this.pwStatus.set({ message: 'Password changed successfully. Other sessions have been revoked.', kind: 'success' });
        this.toast.success('Password changed. Other sessions revoked.');
      },
      error: (err: ApiError) => {
        this.changingPassword.set(false);
        if (err.field && err.field in this.pwForm.controls) {
          const control = this.pwForm.get(err.field);
          control?.setErrors({ ...(control.errors ?? {}), server: err.message });
          control?.markAsTouched();
        }
        this.pwStatus.set({ message: err.message, kind: 'failure' });
        this.toast.error(err.message);
      },
    });
  }

  toggleCurrentPw(): void { this.showCurrentPw.update((v) => !v); }
  toggleNewPw(): void { this.showNewPw.update((v) => !v); }
  toggleConfirmPw(): void { this.showConfirmPw.update((v) => !v); }
}
