import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { DashboardComponent } from './dashboard.component';

/** Flush all three requests that ngOnInit makes. */
function flushRequests(httpMock: HttpTestingController, userCount = 0, sessionCount = 1) {
  httpMock.expectOne('/api/users').flush({ count: userCount, users: [] });
  httpMock.expectOne('/api/sessions').flush({ count: sessionCount, sessions: [] });
  httpMock
    .expectOne('/api/health')
    .flush({ status: 'ok', uptimeSeconds: 60, users: userCount, sessions: sessionCount, node: 'v20.0.0' });
}

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
    fixture.detectChanges();
    flushRequests(httpMock);
    expect(component).toBeTruthy();
  });

  it('userCount signal starts as "—"', () => {
    expect(component.userCount()).toBe('—');
  });

  it('ngOnInit() calls GET /api/users and updates userCount', () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/users').flush({ count: 5, users: [] });
    httpMock.expectOne('/api/sessions').flush({ count: 1, sessions: [] });
    httpMock
      .expectOne('/api/health')
      .flush({ status: 'ok', uptimeSeconds: 60, users: 5, sessions: 1, node: 'v20.0.0' });
    expect(component.userCount()).toBe('5');
  });

  it('sets userCount to "n/a" when GET /api/users fails', () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/users').flush(null, { status: 500, statusText: 'Server Error' });
    httpMock.expectOne('/api/sessions').flush({ count: 0, sessions: [] });
    httpMock
      .expectOne('/api/health')
      .flush({ status: 'ok', uptimeSeconds: 60, users: 0, sessions: 0, node: 'v20.0.0' });
    expect(component.userCount()).toBe('n/a');
  });

  it('has 3 stat cards', () => {
    fixture.detectChanges();
    flushRequests(httpMock);
    expect(component.cards().length).toBe(3);
  });

  it('has activity entries', () => {
    fixture.detectChanges();
    flushRequests(httpMock);
    expect(component.activity.length).toBeGreaterThan(0);
  });

  it('has system info entries', () => {
    fixture.detectChanges();
    flushRequests(httpMock);
    expect(component.systemInfo().length).toBeGreaterThan(0);
  });

  it('exposes current year', () => {
    fixture.detectChanges();
    flushRequests(httpMock);
    expect(component.year).toBe(new Date().getFullYear());
  });

  it('healthy() becomes true when health endpoint returns ok', () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/users').flush({ count: 0, users: [] });
    httpMock.expectOne('/api/sessions').flush({ count: 0, sessions: [] });
    httpMock
      .expectOne('/api/health')
      .flush({ status: 'ok', uptimeSeconds: 120, users: 0, sessions: 0, node: 'v20.0.0' });
    expect(component.healthy()).toBe(true);
  });
});
