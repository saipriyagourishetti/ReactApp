import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';

import { SiteFooterComponent } from './site-footer.component';

describe('SiteFooterComponent', () => {
  let fixture: ComponentFixture<SiteFooterComponent>;
  let component: SiteFooterComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SiteFooterComponent, RouterTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(SiteFooterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('displays the current year', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const year = new Date().getFullYear();
    expect(compiled.textContent).toContain(String(year));
    expect(component.year).toBe(year);
  });

  it('renders footer navigation links', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const links = compiled.querySelectorAll('.footer-links a');
    expect(links.length).toBeGreaterThanOrEqual(4);
  });

  it('has a Home link pointing to /', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const links = Array.from(compiled.querySelectorAll('.footer-links a'));
    const home = links.find((l) => l.textContent?.trim() === 'Home') as HTMLAnchorElement | undefined;
    expect(home).toBeTruthy();
  });

  it('has an About link', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const links = Array.from(compiled.querySelectorAll('.footer-links a'));
    const about = links.find((l) => l.textContent?.trim() === 'About');
    expect(about).toBeTruthy();
  });

  it('has a Dashboard link', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const links = Array.from(compiled.querySelectorAll('.footer-links a'));
    const dashboard = links.find((l) => l.textContent?.trim() === 'Dashboard');
    expect(dashboard).toBeTruthy();
  });
});
