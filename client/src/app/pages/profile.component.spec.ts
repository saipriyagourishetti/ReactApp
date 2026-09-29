import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { ProfileComponent } from './profile.component';
import { AuthService } from '../core/auth.service';
import { ToastService } from '../core/toast.service';
import { User } from '../core/models';

const DEMO_USER: User = {
  id: 1,
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  role: 'admin',
  createdAt: '2024-01-01T00:00:00.000Z',
  hasPassword: true,
  displayName: 'Ada Lovelace',
  bio: 'First programmer.',
  notifications: { emailAlerts: true, weeklyDigest: false, securityAlerts: true },
};

describe('ProfileComponent', () => {
  let fixture: ComponentFixture<ProfileComponent>;
  let component: ProfileComponent;
  let httpMock: HttpTestingController;
  let authService: AuthService;
  let toastService: ToastService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileComponent, RouterTestingModule, HttpClientTestingModule],
    }).compileComponents();

    authService = TestBed.inject(AuthService);
    // Pre-populate auth state so the form can be filled from the current user.
    authService.currentUser.set(DEMO_USER);

    fixture = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    toastService = TestBed.inject(ToastService);
    fixture.detectChanges();

    // ngOnInit calls GET /api/sessions for the stats panel.
    httpMock.expectOne('/api/sessions').flush({ count: 3, sessions: [] });
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ── initial form state ────────────────────────────────────────────────────

  it('form is valid initially (pre-populated from AuthService)', () => {
    expect(component.form.valid).toBe(true);
  });

  it('displayName is pre-populated from current user', () => {
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

  it('status signal starts with empty message', () => {
    expect(component.status().message).toBe('');
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

  // ── submit with valid form ────────────────────────────────────────────────

  it('submit() calls PATCH /api/users/:id', () => {
    component.submit();
    const req = httpMock.expectOne('/api/users/1');
    expect(req.request.method).toBe('PATCH');
    req.flush({ user: DEMO_USER });
  });

  it('submit() sets saving=true during the request', () => {
    component.submit();
    expect(component.saving()).toBe(true);
    httpMock.expectOne('/api/users/1').flush({ user: DEMO_USER });
    expect(component.saving()).toBe(false);
  });

  it('submit() sets success status after save', () => {
    component.submit();
    httpMock.expectOne('/api/users/1').flush({ user: DEMO_USER });
    expect(component.status().kind).toBe('success');
  });

  it('submit() calls toast.success after save', () => {
    jest.spyOn(toastService, 'success');
    component.submit();
    httpMock.expectOne('/api/users/1').flush({ user: DEMO_USER });
    expect(toastService.success).toHaveBeenCalled();
  });

  // ── stats ─────────────────────────────────────────────────────────────────

  it('has 3 stat entries', () => {
    expect(component.stats().length).toBe(3);
  });

  // ── password change form ──────────────────────────────────────────────────

  it('changingPassword signal starts false', () => {
    expect(component.changingPassword()).toBe(false);
  });

  it('submitPasswordChange() requires fields to be filled', () => {
    jest.spyOn(component.pwForm, 'markAllAsTouched');
    component.submitPasswordChange();
    expect(component.pwForm.markAllAsTouched).toHaveBeenCalled();
  });
});
