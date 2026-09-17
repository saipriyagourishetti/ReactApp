import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';

import { AboutComponent } from './about.component';

describe('AboutComponent', () => {
  let fixture: ComponentFixture<AboutComponent>;
  let component: AboutComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AboutComponent, RouterTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(AboutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('has values data', () => {
    expect(component.values.length).toBeGreaterThan(0);
  });

  it('has 4 team members', () => {
    expect(component.team.length).toBe(4);
  });

  it('has milestones data', () => {
    expect(component.milestones.length).toBeGreaterThan(0);
  });

  it('renders the site header', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-site-header')).toBeTruthy();
  });

  it('renders the site footer', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-site-footer')).toBeTruthy();
  });

  it('each team member has name, role, initials, and bio', () => {
    component.team.forEach((member) => {
      expect(member.name.length).toBeGreaterThan(0);
      expect(member.role.length).toBeGreaterThan(0);
      expect(member.initials.length).toBeGreaterThan(0);
      expect(member.bio.length).toBeGreaterThan(0);
    });
  });
});
