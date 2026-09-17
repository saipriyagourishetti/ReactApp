import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { ToastService } from '../core/toast.service';
import { SiteFooterComponent } from '../shared/site-footer.component';
import { SiteHeaderComponent } from '../shared/site-header.component';

/**
 * Profile page, converted from public/profile.html.
 *
 * The inline demo-submit script is now a reactive form. As in the original,
 * saving is simulated — there is no profile endpoint on the API.
 */
@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, SiteHeaderComponent, SiteFooterComponent],
  host: { class: 'auth-body' },
  templateUrl: './profile.component.html',
})
export class ProfileComponent {
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);

  readonly saving = signal(false);
  readonly status = signal('');

  readonly form = this.fb.nonNullable.group({
    displayName: ['Ada Lovelace', [Validators.required, Validators.minLength(2)]],
    email: [{ value: 'ada@example.com', disabled: true }],
    bio: ['First programmer. Mathematics enthusiast. Node.js fan.', [Validators.maxLength(280)]],
    role: [{ value: 'admin', disabled: true }],
    emailAlerts: [true],
    weeklyDigest: [false],
    securityAlerts: [true],
  });

  readonly stats = [
    { value: '12', label: 'Sessions', color: 'var(--accent)' },
    { value: '4', label: 'Projects', color: 'var(--accent-2)' },
    { value: '98', label: 'Requests', color: 'var(--accent-3)' },
  ];

  get displayNameInvalid(): boolean {
    const c = this.form.controls.displayName;
    return c.invalid && (c.touched || c.dirty);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.warning('Please fix the highlighted fields.');
      return;
    }

    this.saving.set(true);
    this.status.set('');

    // Mirrors the 800ms fake latency from the original inline script.
    setTimeout(() => {
      this.saving.set(false);
      this.status.set('Profile updated successfully (demo — no data persisted).');
      this.toast.success('Profile saved (demo only).');
    }, 800);
  }
}
