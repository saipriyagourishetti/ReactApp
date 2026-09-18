import { TestBed, fakeAsync, tick } from '@angular/core/testing';

import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ToastService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('starts with an empty toast list', () => {
    expect(service.toasts()).toEqual([]);
  });

  // ── show() ────────────────────────────────────────────────────────────────

  describe('show()', () => {
    it('adds a toast to the signal', () => {
      service.show('Hello');
      expect(service.toasts().length).toBe(1);
      expect(service.toasts()[0].message).toBe('Hello');
      expect(service.toasts()[0].kind).toBe('info');
    });

    it('returns null for an empty message', () => {
      const id = service.show('');
      expect(id).toBeNull();
      expect(service.toasts().length).toBe(0);
    });

    it('assigns incrementing ids', () => {
      const id1 = service.show('first');
      const id2 = service.show('second');
      expect(id1).toBe(1);
      expect(id2).toBe(2);
    });

    it('auto-dismisses after the default timeout', fakeAsync(() => {
      service.show('auto dismiss');
      expect(service.toasts().length).toBe(1);
      tick(4500);
      expect(service.toasts().length).toBe(0);
    }));

    it('auto-dismisses after a custom timeout', fakeAsync(() => {
      service.show('custom', 'info', 1000);
      tick(999);
      expect(service.toasts().length).toBe(1);
      tick(1);
      expect(service.toasts().length).toBe(0);
    }));
  });

  // ── convenience methods ───────────────────────────────────────────────────

  describe('success()', () => {
    it('adds a success toast', () => {
      service.success('Done!');
      expect(service.toasts()[0].kind).toBe('success');
    });
  });

  describe('error()', () => {
    it('adds an error toast', () => {
      service.error('Oops!');
      expect(service.toasts()[0].kind).toBe('error');
    });
  });

  describe('warning()', () => {
    it('adds a warning toast', () => {
      service.warning('Watch out!');
      expect(service.toasts()[0].kind).toBe('warning');
    });
  });

  describe('info()', () => {
    it('adds an info toast', () => {
      service.info('FYI');
      expect(service.toasts()[0].kind).toBe('info');
    });
  });

  // ── dismiss() ─────────────────────────────────────────────────────────────

  describe('dismiss()', () => {
    it('removes the toast with the given id', () => {
      const id = service.show('to remove')!;
      service.show('to keep');
      service.dismiss(id);
      expect(service.toasts().length).toBe(1);
      expect(service.toasts()[0].message).toBe('to keep');
    });

    it('is a no-op for an unknown id', () => {
      service.show('alive');
      service.dismiss(999);
      expect(service.toasts().length).toBe(1);
    });

    it('clears the auto-dismiss timer so it does not fire again', fakeAsync(() => {
      const id = service.show('early dismiss', 'info', 5000)!;
      tick(1000);
      service.dismiss(id);
      expect(service.toasts().length).toBe(0);
      // Timer should not fire or throw after manual dismiss.
      tick(4000);
      expect(service.toasts().length).toBe(0);
    }));
  });
});
