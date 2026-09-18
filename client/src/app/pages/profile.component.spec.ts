import { ComponentFixture, TestBed, fakeAsync, tick, discardPeriodicTasks } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';

import { ProfileComponent } from './profile.component';
import { ToastService } from '../core/toast.service';

describe('ProfileComponent', () => {
  let fixture: ComponentFixture<ProfileComponent>;
  let component: ProfileComponent;
  let toastService: ToastService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileComponent, RouterTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
    toastService = TestBed.inject(ToastService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ── initial form state ────────────────────────────────────────────────────

  it('form is valid initially (pre-populated demo values)', () => {
    expect(component.form.valid).toBe(true);
  });

  it('displayName is pre-populated', () => {
    expect(component.form.controls.displayName.value).toBe('Ada Lovelace');
  });

  it('email field is disabled', () => {
    expect(component.form.controls.email.disabled).toBe(true);
  });

  it('role field is disabled', () => {
    expect(component.form.controls.role.disabled).toBe(true);
  });

  it('saving signal starts false', () => {
    expect(component.saving()).toBe(false);
  });

  it('status signal starts empty', () => {
    expect(component.status()).toBe('');
  });

  // ── displayNameInvalid ────────────────────────────────────────────────────

  it('displayNameInvalid is false when field is valid and untouched', () => {
    expect(component.displayNameInvalid).toBe(false);
  });

  it('displayNameInvalid is true when field is invalid and touched', () => {
    component.form.controls.displayName.setValue('');
    component.form.controls.displayName.markAsTouched();
    expect(component.displayNameInvalid).toBe(true);
  });

  // ── submit with invalid form ──────────────────────────────────────────────

  it('submit() calls markAllAsTouched when form invalid', () => {
    component.form.controls.displayName.setValue('');
    jest.spyOn(component.form, 'markAllAsTouched');
    component.submit();
    expect(component.form.markAllAsTouched).toHaveBeenCalled();
  });

  it('submit() shows toast warning when form invalid', () => {
    component.form.controls.displayName.setValue('');
    jest.spyOn(toastService, 'warning');
    component.submit();
    expect(toastService.warning).toHaveBeenCalled();
  });

  // ── submit with valid form (uses fakeAsync to flush setTimeout) ────────────

  it('submit() sets saving=true during fake latency', fakeAsync(() => {
    component.submit();
    expect(component.saving()).toBe(true);
    tick(800);
    // Flush any remaining timers (e.g. ToastService auto-dismiss)
    tick(10000);
    expect(component.saving()).toBe(false);
  }));

  it('submit() sets status message after fake save', fakeAsync(() => {
    component.submit();
    tick(800);
    expect(component.status()).toContain('Profile updated');
    tick(10000); // flush toast timers
  }));

  it('submit() calls toast.success after fake save', fakeAsync(() => {
    jest.spyOn(toastService, 'success');
    component.submit();
    tick(800);
    expect(toastService.success).toHaveBeenCalled();
    tick(10000); // flush toast timers
  }));

  // ── stats ─────────────────────────────────────────────────────────────────

  it('has 3 stat entries', () => {
    expect(component.stats.length).toBe(3);
  });
});
