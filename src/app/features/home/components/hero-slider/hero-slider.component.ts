import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  Inject,
  inject,
  OnInit,
  OnDestroy,
  PLATFORM_ID,
  ViewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SettingsService } from '../../../../core/services/settings.service';
import { HeroSettings } from '../../../../core/models/settings.model';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

@Component({
  selector: 'app-hero-slider',
  templateUrl: './hero-slider.component.html',
  styleUrls: ['./hero-slider.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeroSliderComponent implements OnInit, OnDestroy {
  @ViewChild('heroWrapper', { static: false }) heroWrapperEl?: ElementRef<HTMLElement>;

  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr       = inject(ChangeDetectorRef);
  private readonly settingsService = inject(SettingsService);

  private ctx?: gsap.Context;
  private isBrowser: boolean;

  isLoading    = true;
  heroSettings: HeroSettings | null = null;

  readonly defaultHeroImage =
    'https://images.unsplash.com/photo-1576602976047-174e57a47881?auto=format&fit=crop&w=1920&q=85';
  readonly defaultBrandName = 'Vitatrex';
  readonly defaultSlogan    =
    'فيتامينات طبيعية 100% بدون سكر مضاف — لصحة ونشاط عائلتك كل يوم ✨';

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    this.fetchData();
  }

  ngOnDestroy(): void {
    if (this.ctx) this.ctx.revert();
    if (this.isBrowser) {
      ScrollTrigger.getAll().forEach((t) => t.kill());
    }
  }

  // ──────────────────────────────────────────────────────────────
  fetchData(): void {
    this.isLoading = true;
    this.cdr.detectChanges();

    this.settingsService
      .getHeroSettings()
      .pipe(
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (settings) => {
          this.heroSettings = settings;
          this.isLoading    = false;
          this.cdr.detectChanges();
          if (this.isBrowser) {
            setTimeout(() => {
              this.initScrollTriggerAnimations();
              ScrollTrigger.refresh();
            }, 60);
          }
        },
        error: () => {
          this.isLoading = false;
          this.cdr.detectChanges();
        },
      });
  }

  get heroImageUrl(): string { return this.heroSettings?.heroImageUrl?.trim() || this.defaultHeroImage; }
  get brandName():    string { return this.heroSettings?.brandName?.trim()    || this.defaultBrandName; }
  get slogan():       string { return this.heroSettings?.slogan?.trim()       || this.defaultSlogan;    }

  // ════════════════════════════════════════════════════════════════
  // 🎬  GSAP SCROLL-TRIGGER ANIMATIONS (banner fruits + manifesto)
  // ════════════════════════════════════════════════════════════════
  private initScrollTriggerAnimations(): void {
    if (!this.isBrowser || !this.heroWrapperEl?.nativeElement) return;
    const wrapper = this.heroWrapperEl.nativeElement;

    if (this.ctx) this.ctx.revert();
    ScrollTrigger.getAll().forEach((t) => t.kill());

    this.ctx = gsap.context(() => {
      // 1. Brand Name reveal
      gsap.fromTo(
        '.hero-brand',
        { opacity: 0.85, letterSpacing: '2px' },
        { opacity: 1, letterSpacing: '0px', duration: 0.8, ease: 'power2.out', clearProps: 'all' }
      );

      // 2. Slogan reveal
      gsap.fromTo(
        '.hero-slogan',
        { opacity: 0.85 },
        { opacity: 1, duration: 0.6, delay: 0.2, ease: 'power2.out', clearProps: 'all' }
      );

      // 3. Banner reveal
      gsap.fromTo(
        '.hero-banner-frame',
        { opacity: 0.85, y: 15, scale: 0.99 },
        { opacity: 1, y: 0, scale: 1, duration: 0.7, delay: 0.1, ease: 'power2.out', clearProps: 'all' }
      );

      // 4. Manifesto strip reveal
      const manifestoEl = wrapper.querySelector<HTMLElement>('.hero-manifesto-strip');
      if (manifestoEl) {
        gsap.fromTo(
          manifestoEl,
          { opacity: 0.85, y: 15 },
          { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out', clearProps: 'all' }
        );
        gsap.fromTo(
          '.arrow-loop',
          { strokeDashoffset: 300 },
          {
            strokeDashoffset: 0,
            duration: 0.85,
            ease: 'power2.out',
            clearProps: 'strokeDashoffset',
            scrollTrigger: { trigger: manifestoEl, start: 'top 95%', once: true },
          }
        );
        gsap.fromTo(
          '.arrow-head',
          { scale: 0, opacity: 0, transformOrigin: '91px 63px' },
          {
            scale: 1,
            opacity: 1,
            duration: 0.45,
            ease: 'back.out(2.4)',
            clearProps: 'all',
            scrollTrigger: { trigger: manifestoEl, start: 'top 95%', once: true },
          }
        );
      }

    }, wrapper);
  }
}

