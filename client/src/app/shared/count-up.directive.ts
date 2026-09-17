import {
  AfterViewInit,
  Directive,
  ElementRef,
  Input,
  NgZone,
  OnDestroy,
  inject,
} from '@angular/core';

/**
 * Animated stat counter, ported from `animateCount` / `initCounters`
 * in public/ui.js. Counts up once the element scrolls into view.
 */
@Directive({
  selector: '[appCountUp]',
  standalone: true,
})
export class CountUpDirective implements AfterViewInit, OnDestroy {
  /** Target value, equivalent to data-count-to. */
  @Input({ alias: 'appCountUp', required: true }) target!: number;
  /** Appended to the rendered number, equivalent to data-count-suffix. */
  @Input() suffix = '';
  @Input() duration = 1400;

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly zone = inject(NgZone);
  private observer?: IntersectionObserver;
  private frame?: number;

  ngAfterViewInit(): void {
    const el = this.host.nativeElement as HTMLElement;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.textContent = `${this.target}${this.suffix}`;
      return;
    }

    if (!('IntersectionObserver' in window)) {
      this.animate(el);
      return;
    }

    this.zone.runOutsideAngular(() => {
      this.observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            this.animate(el);
            this.observer?.unobserve(entry.target);
          });
        },
        { threshold: 0.4 }
      );
      this.observer.observe(el);
    });
  }

  /** Cubic ease-out, identical to the original implementation. */
  private animate(el: HTMLElement): void {
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / this.duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = `${Math.round(this.target * eased)}${this.suffix}`;
      if (progress < 1) this.frame = requestAnimationFrame(step);
    };
    this.frame = requestAnimationFrame(step);
  }

  ngOnDestroy(): void {
    if (this.frame) cancelAnimationFrame(this.frame);
    this.observer?.disconnect();
  }
}
