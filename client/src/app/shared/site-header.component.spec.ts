import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { DOCUMENT } from '@angular/common';

import { SiteHeaderComponent } from './site-header.component';
import { ThemeService } from '../core/theme.service';

describe('SiteHeaderComponent', () => {
  let fixture: ComponentFixture<SiteHeaderComponent>;
  let component: SiteHeaderComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SiteHeaderComponent, RouterTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(SiteHeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders navigation links', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const links = compiled.querySelectorAll('.nav-links a');
    expect(links.length).toBeGreaterThan(0);
  });

  it('renders the brand link', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const brand = compiled.querySelector('.brand');
    expect(brand).toBeTruthy();
  });

  // ── mobile menu ───────────────────────────────────────────────────────────

  it('open signal starts false', () => {
    expect(component.open()).toBe(false);
  });

  it('toggle() opens the nav', () => {
    component.toggle();
    fixture.detectChanges();
    expect(component.open()).toBe(true);
    const header = fixture.nativeElement.querySelector('.site-header') as HTMLElement;
    expect(header.classList.contains('nav-open')).toBe(true);
  });

  it('toggle() closes the nav when already open', () => {
    component.toggle();
    component.toggle();
    expect(component.open()).toBe(false);
  });

  it('close() sets open to false', () => {
    component.toggle();
    component.close();
    expect(component.open()).toBe(false);
  });

  it('onEscape() closes the nav', () => {
    component.toggle();
    component.onEscape();
    expect(component.open()).toBe(false);
  });

  // ── inputs ────────────────────────────────────────────────────────────────

  it('shows login link by default', () => {
    expect(component.showLogin).toBe(true);
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('a[routerLink="/login"]')).toBeTruthy();
  });

  it('hides login link when showLogin=false', async () => {
    component.showLogin = false;
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('a[routerLink="/login"]')).toBeNull();
  });

  it('shows signup link by default', () => {
    expect(component.showSignup).toBe(true);
  });

  it('uses signupLabel input for the signup button text', () => {
    component.signupLabel = 'Join now';
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const btn = compiled.querySelector('a[routerLink="/signup"]');
    expect(btn?.textContent?.trim()).toBe('Join now');
  });

  // ── theme button ──────────────────────────────────────────────────────────

  it('renders the theme toggle button', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const buttons = compiled.querySelectorAll('button.icon-btn');
    // hamburger + theme = 2 buttons
    expect(buttons.length).toBe(2);
  });
});
