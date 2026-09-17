import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { ApiService, ApiError } from './api.service';

describe('ApiService', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  // ── signup ────────────────────────────────────────────────────────────────

  describe('signup()', () => {
    it('posts to /api/signup and returns AuthResponse', () => {
      const payload = { name: 'Ada', email: 'ada@example.com', password: 'secret1', role: 'user' as const };
      const mockResponse = { user: { id: 1, name: 'Ada', email: 'ada@example.com', role: 'user', createdAt: '2024-01-01', hasPassword: true } };

      let result: any;
      service.signup(payload).subscribe((r) => (result = r));

      const req = httpMock.expectOne('/api/signup');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(payload);
      req.flush(mockResponse, { status: 201, statusText: 'Created' });

      expect(result).toEqual(mockResponse);
    });

    it('maps a 409 HTTP error with field hint to ApiError', () => {
      const payload = { name: 'Ada', email: 'ada@example.com', password: 'secret1', role: 'user' as const };
      let caughtError: any;

      service.signup(payload).subscribe({ error: (e) => (caughtError = e) });

      const req = httpMock.expectOne('/api/signup');
      req.flush({ error: 'Email already registered.', field: 'email' }, { status: 409, statusText: 'Conflict' });

      expect(caughtError).toBeInstanceOf(ApiError);
      expect(caughtError.message).toBe('Email already registered.');
      expect(caughtError.field).toBe('email');
      expect(caughtError.status).toBe(409);
    });

    it('maps a 400 HTTP error without field hint to ApiError', () => {
      const payload = { name: 'Ada', email: 'ada@example.com', password: 'short', role: 'user' as const };
      let caughtError: any;

      service.signup(payload).subscribe({ error: (e) => (caughtError = e) });

      const req = httpMock.expectOne('/api/signup');
      req.flush({ error: 'Password must be at least 8 characters.' }, { status: 400, statusText: 'Bad Request' });

      expect(caughtError).toBeInstanceOf(ApiError);
      expect(caughtError.field).toBeUndefined();
      expect(caughtError.status).toBe(400);
    });

    it('maps a network error (status 0) to a friendly message', () => {
      const payload = { name: 'Ada', email: 'ada@example.com', password: 'secret1', role: 'user' as const };
      let caughtError: any;

      service.signup(payload).subscribe({ error: (e) => (caughtError = e) });

      const req = httpMock.expectOne('/api/signup');
      req.error(new ProgressEvent('error'));

      expect(caughtError).toBeInstanceOf(ApiError);
      expect(caughtError.message).toContain('Network error');
      expect(caughtError.status).toBe(0);
    });
  });

  // ── login ─────────────────────────────────────────────────────────────────

  describe('login()', () => {
    it('posts to /api/login and returns AuthResponse', () => {
      const payload = { email: 'ada@example.com', password: 'analytical1' };
      const mockResponse = { user: { id: 1, name: 'Ada', email: 'ada@example.com', role: 'admin', createdAt: '2024-01-01', hasPassword: true } };

      let result: any;
      service.login(payload).subscribe((r) => (result = r));

      const req = httpMock.expectOne('/api/login');
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);

      expect(result).toEqual(mockResponse);
    });

    it('maps a 401 to ApiError', () => {
      let caughtError: any;
      service.login({ email: 'x@x.com', password: 'wrong' }).subscribe({ error: (e) => (caughtError = e) });

      const req = httpMock.expectOne('/api/login');
      req.flush({ error: 'Invalid credentials.' }, { status: 401, statusText: 'Unauthorized' });

      expect(caughtError).toBeInstanceOf(ApiError);
      expect(caughtError.status).toBe(401);
    });
  });

  // ── listUsers ─────────────────────────────────────────────────────────────

  describe('listUsers()', () => {
    it('GETs /api/users and returns count + users', () => {
      const mockResponse = { count: 2, users: [
        { id: 1, name: 'Ada', email: 'ada@example.com', role: 'admin', createdAt: '2024-01-01', hasPassword: true },
        { id: 2, name: 'Grace', email: 'grace@example.com', role: 'editor', createdAt: '2024-02-01', hasPassword: true },
      ]};

      let result: any;
      service.listUsers().subscribe((r) => (result = r));

      const req = httpMock.expectOne('/api/users');
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);

      expect(result.count).toBe(2);
      expect(result.users.length).toBe(2);
    });

    it('maps GET error to ApiError with fallback message', () => {
      let caughtError: any;
      service.listUsers().subscribe({ error: (e) => (caughtError = e) });

      const req = httpMock.expectOne('/api/users');
      req.flush(null, { status: 500, statusText: 'Internal Server Error' });

      expect(caughtError).toBeInstanceOf(ApiError);
      expect(caughtError.message).toBe('Request failed. Please try again.');
    });
  });
});
