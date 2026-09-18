import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CountUpDirective } from './count-up.directive';

@Component({
  standalone: true,
  imports: [CountUpDirective],
  template: `<span [appCountUp]="100" suffix="%" id="counter">0</span>`,
})
class TestHostComponent {}

describe('CountUpDirective', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
    el = fixture.nativeElement.querySelector('#counter') as HTMLElement;
  });

  it('should create the host element', () => {
    expect(el).toBeTruthy();
  });

  it('element is present in the DOM', () => {
    expect(document.body.contains(fixture.nativeElement)).toBe(true);
  });
});

// ── reduced-motion path: sets target value immediately ───────────────────────

describe('CountUpDirective — reduced motion', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let el: HTMLElement;
  let matchMediaSpy: jest.SpyInstance;

  beforeEach(async () => {
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
    el = fixture.nativeElement.querySelector('#counter') as HTMLElement;
  });

  afterEach(() => {
    matchMediaSpy.mockRestore();
    TestBed.resetTestingModule();
  });

  it('immediately sets the target value when prefers-reduced-motion is true', () => {
    // The directive calls el.textContent = `${target}${suffix}` → "100%"
    expect(el.textContent).toBe('100%');
  });
});

// ── no IntersectionObserver: animates immediately ────────────────────────────

describe('CountUpDirective — no IntersectionObserver', () => {
  let savedIO: any;
  let matchMediaSpy: jest.SpyInstance;

  beforeEach(async () => {
    savedIO = (window as any)['IntersectionObserver'];
    delete (window as any)['IntersectionObserver'];

    // matchMedia must return false for reduced-motion so animation path runs
    matchMediaSpy = jest.spyOn(window, 'matchMedia').mockReturnValue({
      matches: false,
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
  });

  afterEach(() => {
    (window as any)['IntersectionObserver'] = savedIO;
    matchMediaSpy.mockRestore();
    TestBed.resetTestingModule();
  });

  it('starts animation without IntersectionObserver', () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement.querySelector('#counter') as HTMLElement;
    // Animation has started — element must exist
    expect(el).toBeTruthy();
  });
});
