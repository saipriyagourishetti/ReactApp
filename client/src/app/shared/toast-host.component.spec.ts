import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ToastHostComponent } from './toast-host.component';
import { ToastService } from '../core/toast.service';

describe('ToastHostComponent', () => {
  let fixture: ComponentFixture<ToastHostComponent>;
  let component: ToastHostComponent;
  let toastService: ToastService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ToastHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ToastHostComponent);
    component = fixture.componentInstance;
    toastService = TestBed.inject(ToastService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders the toast host container', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.toast-host')).toBeTruthy();
  });

  it('renders no toasts when the list is empty', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelectorAll('.toast').length).toBe(0);
  });

  it('renders a toast when the service emits one', () => {
    toastService.show('Hello world', 'info');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const toasts = compiled.querySelectorAll('.toast');
    expect(toasts.length).toBe(1);
    expect(toasts[0].textContent).toContain('Hello world');
  });

  it('renders multiple toasts', () => {
    toastService.success('Done!');
    toastService.error('Oops!');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelectorAll('.toast').length).toBe(2);
  });

  it('applies toast-success class for success kind', () => {
    toastService.success('Great!');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const toast = compiled.querySelector('.toast');
    expect(toast?.classList.contains('toast-success')).toBe(true);
  });

  it('applies toast-error class for error kind', () => {
    toastService.error('Fail!');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const toast = compiled.querySelector('.toast');
    expect(toast?.classList.contains('toast-error')).toBe(true);
  });

  it('dismiss() removes a toast from the view', () => {
    const id = toastService.show('to remove', 'info')!;
    fixture.detectChanges();

    component.dismiss(id);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelectorAll('.toast').length).toBe(0);
  });

  it('icon() returns the correct icon for each kind', () => {
    expect(component.icon('success')).toBe('✓');
    expect(component.icon('error')).toBe('✕');
    expect(component.icon('warning')).toBe('!');
    expect(component.icon('info')).toBe('i');
  });

  it('dismiss button calls dismiss on click', () => {
    const id = toastService.show('clickable', 'info')!;
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const btn = compiled.querySelector('.toast-close') as HTMLButtonElement;
    btn.click();
    fixture.detectChanges();

    expect(compiled.querySelectorAll('.toast').length).toBe(0);
  });
});
