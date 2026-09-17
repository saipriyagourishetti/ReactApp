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
 * Scroll-reveal animation, ported from `initReveal` in public/ui.js.
 *
 * Adds the `is-visible` class when the host scrolls into view. Honours
 * prefers-reduced-motion and degrades to "always visible" where
 * IntersectionObserver is unavailable.
 */
@Directive({
  selector: '[appReveal]',
  standalone: true,
  host: { '[class.reveal]': 'true' },
})
export class RevealDirective implements AfterViewInit, OnDestroy {
  /** Delay in ms before the class is applied, matching data-reveal-delay. */
  @Input('appReveal') delay: number | string = 0;

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly zone = inject(NgZone);
  private observer?: IntersectionObserver;
  private timer?: ReturnType<typeof setTimeout>;

  ngAfterViewInit(): void {
    const el = this.host.nativeElement as HTMLElement;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduced || !('IntersectionObserver' in window)) {
      el.classList.add('is-visible');
      return;
    }

    // Keep observer callbacks out of Angular's zone; toggling a class does not
    // need to trigger change detection.
    this.zone.runOutsideAngular(() => {
      this.observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const wait = Number(this.delay) || 0;
            this.timer = setTimeout(() => el.classList.add('is-visible'), wait);
            this.observer?.unobserve(entry.target);
          });
        },
        { rootMargin: '0px 0px -10% 0px', threshold: 0.12 }
      );
      this.observer.observe(el);
    });
  }

  ngOnDestroy(): void {
    clearTimeout(this.timer);
    this.observer?.disconnect();
  }
}
