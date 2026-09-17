import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';

import { HomeComponent } from './home.component';

describe('HomeComponent', () => {
  let fixture: ComponentFixture<HomeComponent>;
  let component: HomeComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeComponent, RouterTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('has 4 stats entries', () => {
    expect(component.stats.length).toBe(4);
  });

  it('has features', () => {
    expect(component.features.length).toBeGreaterThan(0);
  });

  it('has plans', () => {
    expect(component.plans.length).toBe(3);
  });

  it('has one featured plan', () => {
    const featured = component.plans.filter((p) => p.featured);
    expect(featured.length).toBe(1);
  });

  it('copied signal starts false', () => {
    expect(component.copied()).toBe(false);
  });

  it('snippet is a non-empty string', () => {
    expect(component.snippet.length).toBeGreaterThan(0);
  });

  it('renders the site header', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-site-header')).toBeTruthy();
  });

  it('renders the site footer', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-site-footer')).toBeTruthy();
  });
});
