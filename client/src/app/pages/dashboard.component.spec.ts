import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { DashboardComponent } from './dashboard.component';

describe('DashboardComponent', () => {
  let fixture: ComponentFixture<DashboardComponent>;
  let component: DashboardComponent;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent, RouterTestingModule, HttpClientTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    fixture.detectChanges(); // triggers ngOnInit → GET /api/users
    httpMock.expectOne('/api/users').flush({ count: 0, users: [] });
    expect(component).toBeTruthy();
  });

  it('userCount signal starts as "—"', () => {
    expect(component.userCount()).toBe('—');
  });

  it('ngOnInit() calls GET /api/users and updates userCount', () => {
    fixture.detectChanges();
    const req = httpMock.expectOne('/api/users');
    expect(req.request.method).toBe('GET');
    req.flush({ count: 5, users: [] });
    expect(component.userCount()).toBe('5');
  });

  it('sets userCount to "n/a" when GET /api/users fails', () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/users').flush(null, { status: 500, statusText: 'Server Error' });
    expect(component.userCount()).toBe('n/a');
  });

  it('has 3 stat cards', () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/users').flush({ count: 0, users: [] });
    expect(component.cards.length).toBe(3);
  });

  it('has activity entries', () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/users').flush({ count: 0, users: [] });
    expect(component.activity.length).toBeGreaterThan(0);
  });

  it('has system info entries', () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/users').flush({ count: 0, users: [] });
    expect(component.systemInfo.length).toBeGreaterThan(0);
  });

  it('exposes current year', () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/users').flush({ count: 0, users: [] });
    expect(component.year).toBe(new Date().getFullYear());
  });
});
