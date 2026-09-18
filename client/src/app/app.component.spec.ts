import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';

import { AppComponent } from './app.component';

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;
  let component: AppComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent, RouterTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should contain a router-outlet', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('router-outlet')).toBeTruthy();
  });

  it('should render the skip link', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const link = compiled.querySelector('.skip-link') as HTMLAnchorElement;
    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toBe('#main');
  });

  it('should render the scroll progress bar', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.scroll-progress')).toBeTruthy();
  });

  it('should render the back-to-top button', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.back-to-top')).toBeTruthy();
  });

  it('should render the toast host', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-toast-host')).toBeTruthy();
  });

  // ── signal state ──────────────────────────────────────────────────────────

  it('progress signal starts at 0', () => {
    expect(component.progress()).toBe(0);
  });

  it('showTop signal starts as false', () => {
    expect(component.showTop()).toBe(false);
  });

  it('back-to-top button does not have is-visible class initially', () => {
    const btn = fixture.nativeElement.querySelector('.back-to-top') as HTMLButtonElement;
    expect(btn.classList.contains('is-visible')).toBe(false);
  });

  it('onScroll() updates progress and showTop signals when scrolled past 420', () => {
    // Override window properties via Object.defineProperty (jsdom defines them as value, not getter)
    Object.defineProperty(window, 'scrollY', { value: 500, writable: true, configurable: true });
    Object.defineProperty(window, 'pageYOffset', { value: 500, writable: true, configurable: true });
    Object.defineProperty(document.documentElement, 'scrollHeight', { value: 2000, writable: true, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 800, writable: true, configurable: true });

    component.onScroll();
    fixture.detectChanges();

    // scrolled=500, max=2000-800=1200 → progress ≈ 41.67
    expect(component.progress()).toBeCloseTo(41.67, 1);
    expect(component.showTop()).toBe(true);

    // Restore
    Object.defineProperty(window, 'scrollY', { value: 0, writable: true, configurable: true });
    Object.defineProperty(window, 'pageYOffset', { value: 0, writable: true, configurable: true });
  });

  it('onScroll() sets showTop=false when scrolled ≤ 420', () => {
    Object.defineProperty(window, 'scrollY', { value: 100, writable: true, configurable: true });
    Object.defineProperty(window, 'pageYOffset', { value: 100, writable: true, configurable: true });
    Object.defineProperty(document.documentElement, 'scrollHeight', { value: 2000, writable: true, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 800, writable: true, configurable: true });

    component.onScroll();
    expect(component.showTop()).toBe(false);

    Object.defineProperty(window, 'scrollY', { value: 0, writable: true, configurable: true });
    Object.defineProperty(window, 'pageYOffset', { value: 0, writable: true, configurable: true });
  });
});
