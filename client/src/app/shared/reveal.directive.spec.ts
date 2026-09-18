import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RevealDirective } from './reveal.directive';

@Component({
  standalone: true,
  imports: [RevealDirective],
  template: `<div [appReveal]="0" id="target">Content</div>`,
})
class TestHostComponent {}

describe('RevealDirective', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
    el = fixture.nativeElement.querySelector('#target') as HTMLElement;
  });

  it('should add the reveal CSS class to the host element', () => {
    expect(el.classList.contains('reveal')).toBe(true);
  });

  it('should not throw during setup', () => {
    // In the jsdom environment: matchMedia matches=false (from setup-jest.ts stub),
    // IntersectionObserver may or may not be present. The directive handles both cases.
    expect(el).toBeTruthy();
  });

  it('host element exists in the DOM', () => {
    expect(document.body.contains(fixture.nativeElement)).toBe(true);
  });
});

// ── reduced-motion path ───────────────────────────────────────────────────────

describe('RevealDirective — reduced motion', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let el: HTMLElement;
  let matchMediaSpy: jest.SpyInstance;

  beforeEach(async () => {
    // Mock matchMedia to return reduced-motion = true BEFORE component creates
    matchMediaSpy = jest.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true,
      media: '',
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    } as MediaQueryList);

    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
    el = fixture.nativeElement.querySelector('#target') as HTMLElement;
  });

  afterEach(() => {
    matchMediaSpy.mockRestore();
    TestBed.resetTestingModule();
  });

  it('adds is-visible immediately when prefers-reduced-motion is set', () => {
    expect(el.classList.contains('is-visible')).toBe(true);
  });
});
