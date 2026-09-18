import { TestBed } from '@angular/core/testing';

import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let localStorageMock: Record<string, string>;
  let getItemSpy: jest.SpyInstance;
  let setItemSpy: jest.SpyInstance;

  beforeEach(() => {
    localStorageMock = {};

    // Spy on the Storage prototype instead of __proto__
    getItemSpy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(
      (k: string) => localStorageMock[k] ?? null
    );
    setItemSpy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(
      (k: string, v: string) => { localStorageMock[k] = v; }
    );

    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    document.documentElement.removeAttribute('data-theme');
  });

  function createService(): ThemeService {
    return TestBed.inject(ThemeService);
  }

  it('should be created', () => {
    expect(createService()).toBeTruthy();
  });

  // ── initialTheme() ────────────────────────────────────────────────────────

  describe('initial theme resolution', () => {
    it('uses data-theme attribute on documentElement when present (light)', () => {
      document.documentElement.setAttribute('data-theme', 'light');
      const service = createService();
      expect(service.theme()).toBe('light');
    });

    it('uses data-theme attribute on documentElement when present (dark)', () => {
      document.documentElement.setAttribute('data-theme', 'dark');
      const service = createService();
      expect(service.theme()).toBe('dark');
    });

    it('falls back to localStorage "light" when attribute is absent', () => {
      document.documentElement.removeAttribute('data-theme');
      localStorageMock['dp-theme'] = 'light';
      const service = createService();
      expect(service.theme()).toBe('light');
    });

    it('defaults to dark when matchMedia returns false (no light preference)', () => {
      document.documentElement.removeAttribute('data-theme');
      // setup-jest.ts stubs matchMedia to return matches:false (dark preference)
      const service = createService();
      expect(service.theme()).toBe('dark');
    });
  });

  // ── toggle() ──────────────────────────────────────────────────────────────

  describe('toggle()', () => {
    it('switches dark → light', () => {
      document.documentElement.setAttribute('data-theme', 'dark');
      const service = createService();
      const next = service.toggle();
      expect(next).toBe('light');
      expect(service.theme()).toBe('light');
    });

    it('switches light → dark', () => {
      document.documentElement.setAttribute('data-theme', 'light');
      const service = createService();
      const next = service.toggle();
      expect(next).toBe('dark');
      expect(service.theme()).toBe('dark');
    });
  });

  // ── set() ─────────────────────────────────────────────────────────────────

  describe('set()', () => {
    it('updates the signal', () => {
      document.documentElement.setAttribute('data-theme', 'dark');
      const service = createService();
      service.set('light');
      expect(service.theme()).toBe('light');
    });

    it('applies data-theme attribute to documentElement', () => {
      document.documentElement.setAttribute('data-theme', 'dark');
      const service = createService();
      service.set('light');
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });

    it('persists to localStorage', () => {
      document.documentElement.setAttribute('data-theme', 'dark');
      const service = createService();
      service.set('light');
      expect(localStorageMock['dp-theme']).toBe('light');
    });
  });
});
