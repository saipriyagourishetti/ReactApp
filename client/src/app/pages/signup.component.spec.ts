import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { SignupComponent } from './signup.component';
import { ToastService } from '../core/toast.service';

describe('SignupComponent', () => {
  let fixture: ComponentFixture<SignupComponent>;
  let component: SignupComponent;
  let httpMock: HttpTestingController;
  let toastService: ToastService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SignupComponent, RouterTestingModule, HttpClientTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(SignupComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    toastService = TestBed.inject(ToastService);
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ── initial state ─────────────────────────────────────────────────────────

  it('submitting signal starts false', () => {
    expect(component.submitting()).toBe(false);
  });

  it('status signal starts empty', () => {
    expect(component.status().message).toBe('');
    expect(component.status().kind).toBe('');
  });

  it('form is invalid initially (empty required fields)', () => {
    expect(component.form.invalid).toBe(true);
  });

  it('role defaults to user', () => {
    expect(component.form.controls.role.value).toBe('user');
  });

  // ── validation ────────────────────────────────────────────────────────────

  it('showError() returns false before user touches the field', () => {
    expect(component.showError('name')).toBe(false);
  });

  it('showError() returns true when field is touched and invalid', () => {
    component.form.controls.name.markAsTouched();
    expect(component.showError('name')).toBe(true);
  });

  it('errorFor() returns empty string when no error to show', () => {
    expect(component.errorFor('name')).toBe('');
  });

  it('errorFor(name) returns message when touched and empty', () => {
    component.form.controls.name.markAsTouched();
    expect(component.errorFor('name')).toBeTruthy();
  });

  it('errorFor(email) returns message for invalid email after touch', () => {
    component.form.controls.email.setValue('notvalid');
    component.form.controls.email.markAsDirty();
    expect(component.errorFor('email')).toContain('valid email');
  });

  it('errorFor(password) returns message for short password', () => {
    component.form.controls.password.setValue('short');
    component.form.controls.password.markAsTouched();
    expect(component.errorFor('password')).toContain('8 characters');
  });

  it('errorFor(confirm) returns mismatch message', () => {
    component.form.controls.password.setValue('password1');
    component.form.controls.confirm.setValue('different');
    component.form.controls.confirm.markAsTouched();
    // trigger group validator
    component.form.updateValueAndValidity();
    expect(component.errorFor('confirm')).toContain('Passwords do not match');
  });

  it('errorFor(terms) returns message when unticked and touched', () => {
    component.form.controls.terms.setValue(false);
    component.form.controls.terms.markAsTouched();
    expect(component.errorFor('terms')).toContain('terms');
  });

  // ── toggle password visibility ────────────────────────────────────────────

  it('showPassword signal starts false', () => {
    expect(component.showPassword()).toBe(false);
  });

  it('togglePassword() flips showPassword', () => {
    component.togglePassword();
    expect(component.showPassword()).toBe(true);
    component.togglePassword();
    expect(component.showPassword()).toBe(false);
  });

  it('showConfirm signal starts false', () => {
    expect(component.showConfirm()).toBe(false);
  });

  it('toggleConfirm() flips showConfirm', () => {
    component.toggleConfirm();
    expect(component.showConfirm()).toBe(true);
  });

  // ── submit with invalid form ───────────────────────────────────────────────

  it('submit() marks all fields as touched when form is invalid', () => {
    jest.spyOn(component.form, 'markAllAsTouched');
    component.submit();
    expect(component.form.markAllAsTouched).toHaveBeenCalled();
  });

  it('submit() sets failure status when form is invalid', () => {
    component.submit();
    expect(component.status().kind).toBe('failure');
  });

  // ── submit with valid form ────────────────────────────────────────────────

  function fillValidForm() {
    component.form.setValue({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'password1',
      confirm: 'password1',
      role: 'user',
      terms: true,
    });
  }

  it('submit() calls POST /api/signup with trimmed values', () => {
    fillValidForm();
    component.submit();

    const req = httpMock.expectOne('/api/signup');
    expect(req.request.method).toBe('POST');
    expect(req.request.body.name).toBe('Ada Lovelace');
    req.flush({ user: { id: 1, name: 'Ada Lovelace', email: 'ada@example.com', role: 'user', createdAt: '2024-01-01', hasPassword: true } },
      { status: 201, statusText: 'Created' });
  });

  it('submit() sets submitting=true during the request', () => {
    fillValidForm();
    component.submit();
    expect(component.submitting()).toBe(true);
    httpMock.expectOne('/api/signup').flush({ user: { id: 1, name: 'Ada Lovelace', email: 'ada@example.com', role: 'user', createdAt: '2024-01-01', hasPassword: true } },
      { status: 201, statusText: 'Created' });
  });

  it('submit() sets success status on 201', () => {
    fillValidForm();
    component.submit();
    httpMock.expectOne('/api/signup').flush({ user: { id: 1, name: 'Ada Lovelace', email: 'ada@example.com', role: 'user', createdAt: '2024-01-01', hasPassword: true } },
      { status: 201, statusText: 'Created' });
    expect(component.status().kind).toBe('success');
    expect(component.submitting()).toBe(false);
  });

  it('submit() sets failure status and server error on 409', () => {
    fillValidForm();
    component.submit();
    httpMock.expectOne('/api/signup').flush({ error: 'Email already registered.', field: 'email' }, { status: 409, statusText: 'Conflict' });

    expect(component.status().kind).toBe('failure');
    expect(component.status().message).toBe('Email already registered.');
    expect(component.form.controls.email.hasError('server')).toBe(true);
  });
});
