import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { LoginComponent } from './login.component';
import { ToastService } from '../core/toast.service';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginComponent;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginComponent, RouterTestingModule, HttpClientTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ── initial state ─────────────────────────────────────────────────────────

  it('form is invalid initially', () => {
    expect(component.form.invalid).toBe(true);
  });

  it('submitting starts false', () => {
    expect(component.submitting()).toBe(false);
  });

  it('showPassword starts false', () => {
    expect(component.showPassword()).toBe(false);
  });

  it('exposes demo email constant', () => {
    expect(component.demoEmail).toBe('ada@example.com');
  });

  // ── validation ────────────────────────────────────────────────────────────

  it('showError() returns false before touching', () => {
    expect(component.showError('email')).toBe(false);
  });

  it('showError() returns true when email is invalid and touched', () => {
    component.form.controls.email.setValue('bad');
    component.form.controls.email.markAsTouched();
    expect(component.showError('email')).toBe(true);
  });

  it('errorFor(email) returns message for invalid email', () => {
    component.form.controls.email.setValue('notvalid');
    component.form.controls.email.markAsDirty();
    expect(component.errorFor('email')).toContain('valid email');
  });

  it('errorFor(password) returns message for empty password', () => {
    component.form.controls.password.markAsTouched();
    expect(component.errorFor('password')).toContain('password');
  });

  // ── togglePassword ────────────────────────────────────────────────────────

  it('togglePassword() flips showPassword', () => {
    component.togglePassword();
    expect(component.showPassword()).toBe(true);
    component.togglePassword();
    expect(component.showPassword()).toBe(false);
  });

  // ── fillDemo ──────────────────────────────────────────────────────────────

  it('fillDemo() populates form with demo credentials', () => {
    component.fillDemo();
    expect(component.form.value.email).toBe('ada@example.com');
    expect(component.form.value.password).toBe('analytical1');
  });

  it('fillDemo() resets status', () => {
    component.status.set({ message: 'old', kind: 'failure' });
    component.fillDemo();
    expect(component.status().message).toBe('');
  });

  // ── submit with invalid form ───────────────────────────────────────────────

  it('submit() marks all touched when form invalid', () => {
    jest.spyOn(component.form, 'markAllAsTouched');
    component.submit();
    expect(component.form.markAllAsTouched).toHaveBeenCalled();
  });

  it('submit() sets failure status for invalid form', () => {
    component.submit();
    expect(component.status().kind).toBe('failure');
  });

  // ── submit with valid form ────────────────────────────────────────────────

  function fillValidForm() {
    component.form.setValue({ email: 'ada@example.com', password: 'analytical1' });
  }

  it('submit() posts to /api/login', () => {
    fillValidForm();
    component.submit();

    const req = httpMock.expectOne('/api/login');
    expect(req.request.method).toBe('POST');
    req.flush({ user: { id: 1, name: 'Ada', email: 'ada@example.com', role: 'admin', createdAt: '2024-01-01', hasPassword: true } });
  });

  it('submit() sets success status on 200', () => {
    fillValidForm();
    component.submit();
    httpMock.expectOne('/api/login').flush({ user: { id: 1, name: 'Ada', email: 'ada@example.com', role: 'admin', createdAt: '2024-01-01', hasPassword: true } });

    expect(component.status().kind).toBe('success');
    expect(component.submitting()).toBe(false);
  });

  it('submit() sets failure status on 401', () => {
    fillValidForm();
    component.submit();
    httpMock.expectOne('/api/login').flush({ error: 'Invalid credentials.' }, { status: 401, statusText: 'Unauthorized' });

    expect(component.status().kind).toBe('failure');
    expect(component.status().message).toBe('Invalid credentials.');
  });

  it('submit() attaches server error to the field hinted by the API', () => {
    fillValidForm();
    component.submit();
    httpMock.expectOne('/api/login').flush({ error: 'Wrong password.', field: 'password' }, { status: 401, statusText: 'Unauthorized' });

    expect(component.form.controls.password.hasError('server')).toBe(true);
  });
});
