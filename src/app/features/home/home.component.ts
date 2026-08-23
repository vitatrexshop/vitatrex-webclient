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

  ngAfterViewInit(): void {
    const STAGGER_MS = 90;

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
          } else {
            el.classList.add('vt-revealed');
          }

          this.observer?.unobserve(el);
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -48px 0px' }
    );

    document.querySelectorAll<HTMLElement>('.vt-section, .vt-reveal').forEach((el) =>
      this.observer!.observe(el)
    );
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
