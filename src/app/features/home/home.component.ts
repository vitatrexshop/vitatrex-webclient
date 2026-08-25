import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
} from '@angular/core';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent implements AfterViewInit, OnDestroy {
  private observer: IntersectionObserver | null = null;
  private safetyTimer?: any;

  ngAfterViewInit(): void {
    const STAGGER_MS = 80;

    // Immediately reveal top above-the-fold sections for instant rendering on refresh
    const allSections = document.querySelectorAll<HTMLElement>('.vt-section, .vt-reveal');
    const viewportHeight = window.innerHeight || 800;

    allSections.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top <= viewportHeight + 150) {
        el.classList.add('vt-revealed');
      }
    });

    if (typeof IntersectionObserver !== 'undefined') {
      this.observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;

            const el = entry.target as HTMLElement;
            const children = Array.from(el.querySelectorAll<HTMLElement>('.vt-reveal'));

            if (children.length) {
              children.forEach((child, i) => {
                setTimeout(() => child.classList.add('vt-revealed'), i * STAGGER_MS);
              });
            }
            el.classList.add('vt-revealed');
            this.observer?.unobserve(el);
          });
        },
        { threshold: 0.01, rootMargin: '120px 0px 120px 0px' }
      );

      allSections.forEach((el) => {
        if (!el.classList.contains('vt-revealed')) {
          this.observer!.observe(el);
        }
      });
    } else {
      // Fallback if IntersectionObserver not available
      allSections.forEach((el) => el.classList.add('vt-revealed'));
    }

    // Safety fallback: ensure all sections are 100% visible after 1.2s regardless of layout shifts
    this.safetyTimer = setTimeout(() => {
      document.querySelectorAll<HTMLElement>('.vt-section, .vt-reveal').forEach((el) => {
        el.classList.add('vt-revealed');
      });
    }, 1200);
  }

  ngOnDestroy(): void {
    if (this.safetyTimer) {
      clearTimeout(this.safetyTimer);
    }
    this.observer?.disconnect();
  }
}
