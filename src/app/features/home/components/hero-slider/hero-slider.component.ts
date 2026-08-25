import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  Inject,
  inject,
  NgZone,
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

// ── Parallax depth layers ─────────────────────────────────────────────────────
// Each entry: [CSS selector, depth multiplier (small = subtle, large = stronger)]
const MOUSE_LAYERS: [string, number][] = [
  ['.fruit-1',  0.035],
  ['.fruit-2',  0.055],
  ['.fruit-3',  0.025],
  ['.fruit-4',  0.045],
  ['.fruit-5',  0.06],
  ['.fruit-6',  0.03],
  ['.fruit-7',  0.07],
  ['.fruit-8',  0.04],
  ['.fruit-9',  0.05],
  ['.fruit-10', 0.028],
  ['.fruit-11', 0.065],
  ['.fruit-12', 0.038],
  ['.sp-1',     0.09],
  ['.sp-2',     0.11],
  ['.sp-3',     0.08],
  ['.sp-4',     0.1],
  ['.sp-5',     0.085],
  ['.sp-6',     0.075],
  ['.sp-7',     0.12],
  ['.sp-8',     0.095],
  ['.arrow-1',  0.022],
  ['.arrow-2',  0.018],
  ['.arrow-3',  0.026],
  ['.arrow-4',  0.02],
  ['.ring-1',   0.008],
  ['.ring-2',   0.012],
];

// ── Scroll drift speeds for background fruits ─────────────────────────────────
const SCROLL_LAYERS: [string, number][] = [
  ['.fruit-1',  -0.12],
  ['.fruit-2',  -0.09],
  ['.fruit-3',  -0.15],
  ['.fruit-4',  -0.08],
  ['.fruit-5',  -0.18],
  ['.fruit-6',  -0.11],
  ['.fruit-7',  -0.14],
  ['.fruit-8',  -0.07],
  ['.fruit-9',  -0.16],
  ['.fruit-10', -0.1],
  ['.fruit-11', -0.13],
  ['.fruit-12', -0.06],
  ['.sp-1',     -0.22],
  ['.sp-2',     -0.19],
  ['.sp-3',     -0.25],
  ['.sp-4',     -0.17],
  ['.sp-5',     -0.21],
  ['.sp-6',     -0.23],
  ['.sp-7',     -0.28],
  ['.sp-8',     -0.15],
];

@Component({
  selector: 'app-hero-slider',
  templateUrl: './hero-slider.component.html',
  styleUrls: ['./hero-slider.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeroSliderComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('heroWrapper', { static: false }) heroWrapperEl?: ElementRef<HTMLElement>;

  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr       = inject(ChangeDetectorRef);
  private readonly settingsService = inject(SettingsService);
  private readonly ngZone    = inject(NgZone);

  private ctx?: gsap.Context;
  private isBrowser: boolean;

  /** GSAP quickTo setters for butter-smooth mouse parallax (no tween overhead) */
  private quickSetters: Array<{ x: gsap.QuickToFunc; y: gsap.QuickToFunc }> = [];

  /** Bound event handler refs for clean teardown */
  private boundMouseMove!: (e: MouseEvent) => void;
  private boundScroll!:    ()              => void;

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

  ngAfterViewInit(): void {
    // Interactive parallax is initialised AFTER data loads (see fetchData)
    // because fruits live inside *ngIf="!isLoading" and aren't in DOM yet here.
  }

  ngOnDestroy(): void {
    if (this.ctx) this.ctx.revert();
    if (this.isBrowser) {
      ScrollTrigger.getAll().forEach((t) => t.kill());
      if (this.boundMouseMove) window.removeEventListener('mousemove', this.boundMouseMove);
      if (this.boundScroll)    window.removeEventListener('scroll',    this.boundScroll);
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
              // Now that *ngIf rendered the fruits, wire up interactive parallax
              this.ngZone.runOutsideAngular(() => {
                this.initMouseParallax();
                this.initScrollParallax();
              });
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
  // 🖱️  MOUSE PARALLAX
  //     Each layer gets its own GSAP quickTo setter.
  //     Moving the cursor shifts elements by (offsetFromCenter × depth × viewport).
  //     Result: elements closer to you move more; far ones barely move → real depth.
  // ════════════════════════════════════════════════════════════════
  private initMouseParallax(): void {
    // Remove any prior listener before re-registering
    if (this.boundMouseMove) window.removeEventListener('mousemove', this.boundMouseMove);

    // Build one quickTo x/y pair per CSS selector
    this.quickSetters = MOUSE_LAYERS.map(([selector, depth]) => {
      const dur = 0.06 + depth * 0.8; // nearer elements snap faster
      return {
        x: gsap.quickTo(selector, 'x', { duration: dur, ease: 'power2.out' }),
        y: gsap.quickTo(selector, 'y', { duration: dur, ease: 'power2.out' }),
      };
    });

    this.boundMouseMove = (e: MouseEvent) => {
      const wW = window.innerWidth;
      const wH = window.innerHeight;
      // Normalised offset from center: range [-0.5, +0.5]
      const cx = e.clientX / wW - 0.5;
      const cy = e.clientY / wH - 0.5;

      MOUSE_LAYERS.forEach(([, depth], i) => {
        const qs = this.quickSetters[i];
        if (!qs) return;
        qs.x(cx * wW * depth);
        qs.y(cy * wH * depth);
      });
    };

    window.addEventListener('mousemove', this.boundMouseMove, { passive: true });
  }

  // ════════════════════════════════════════════════════════════════
  // 📜  SCROLL PARALLAX
  //     Uses GSAP quickTo on the 'y' property — GSAP manages its own
  //     transform pipeline separate from CSS animation so there's no
  //     conflict. rAF-throttled for 60fps efficiency.
  // ════════════════════════════════════════════════════════════════
  private initScrollParallax(): void {
    let rafId    = 0;
    let lastScrollY = window.scrollY;

    // Build GSAP quickTo y-setters for each scroll layer
    const layers = SCROLL_LAYERS.map(([selector, speed]) => ({
      setY:    gsap.quickTo(selector, 'y', { duration: 0.4, ease: 'power1.out' }),
      setOp:   gsap.quickTo(selector, 'opacity', { duration: 0.5, ease: 'none' }),
      speed,
      offsetY: 0,
    }));

    const onScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        const sy    = window.scrollY;
        const delta = sy - lastScrollY;
        lastScrollY = sy;

        const fadeRatio = Math.max(0, 1 - sy / 650); // fully faded by 650px scroll

        layers.forEach((layer) => {
          layer.offsetY += delta * layer.speed;
          layer.setY(layer.offsetY);
          // Keep opacity very subtle; additional fade as user scrolls away from hero
          layer.setOp(0.05 + 0.22 * fadeRatio);
        });

        rafId = 0;
      });
    };

    this.boundScroll = onScroll;
    window.addEventListener('scroll', this.boundScroll, { passive: true });
  }

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
      gsap.from('.hero-brand', {
        opacity: 0, letterSpacing: '10px', duration: 1.2, ease: 'power3.out',
      });

      // 2. Slogan blur-to-focus
      gsap.from('.hero-slogan', {
        opacity: 0, filter: 'blur(5px)', duration: 0.8, delay: 0.4, ease: 'power3.out',
      });

      // 3. Banner reveal
      gsap.from('.hero-banner-frame', {
        opacity: 0, y: 20, scale: 0.99, duration: 0.85, delay: 0.15, ease: 'power2.out',
      });

      // 4. ScrollTrigger scrub — banner fruits swoop in as you scroll
      const scrollTl = gsap.timeline({
        scrollTrigger: {
          trigger: wrapper, start: 'top top', end: 'bottom top',
          scrub: 1, invalidateOnRefresh: true,
        },
      });

      scrollTl
        .fromTo('.floating-left.item-1',  { x: -250, y: 0, rotation: -30, opacity: 0.3, scale: 0.8  }, { x:  35, y: 130, rotation:  35, opacity: 1, scale: 1.15, ease: 'power2.out' }, 0)
        .fromTo('.floating-left.item-2',  { x: -280, y: 0, rotation: -45, opacity: 0.2, scale: 0.7  }, { x:  55, y: 230, rotation:  45, opacity: 1, scale: 1.25, ease: 'power2.out' }, 0.04)
        .fromTo('.floating-left.item-3',  { x: -240, y: 0, rotation:  25, opacity: 0.3, scale: 0.75 }, { x:  30, y: 350, rotation: -30, opacity: 1, scale: 1.1,  ease: 'power2.out' }, 0.08)
        .fromTo('.floating-left.item-7',  { x: -260, y: 0, rotation: -20, opacity: 0.3, scale: 0.8  }, { x:  45, y: 280, rotation:  40, opacity: 1, scale: 1.2,  ease: 'power2.out' }, 0.06)
        .fromTo('.floating-left.item-8',  { x: -230, y: 0, rotation:  35, opacity: 0.25,scale: 0.75 }, { x:  25, y: 390, rotation: -25, opacity: 1, scale: 1.15, ease: 'power2.out' }, 0.1)
        .fromTo('.floating-left.item-11', { x: -300, y: 0, rotation: -35, opacity: 0.2, scale: 0.7  }, { x:  70, y: 190, rotation:  30, opacity: 1, scale: 1.3,  ease: 'power2.out' }, 0.03)
        .fromTo('.floating-right.item-4', { x:  250, y: 0, rotation:  30, opacity: 0.3, scale: 0.85 }, { x: -35, y: 140, rotation: -35, opacity: 1, scale: 1.2,  ease: 'power2.out' }, 0)
        .fromTo('.floating-right.item-5', { x:  290, y: 0, rotation:  45, opacity: 0.2, scale: 0.75 }, { x: -60, y: 250, rotation: -45, opacity: 1, scale: 1.3,  ease: 'power2.out' }, 0.04)
        .fromTo('.floating-right.item-6', { x:  250, y: 0, rotation: -25, opacity: 0.3, scale: 0.7  }, { x: -30, y: 370, rotation:  40, opacity: 1, scale: 1.15, ease: 'power2.out' }, 0.08)
        .fromTo('.floating-right.item-9', { x:  270, y: 0, rotation:  25, opacity: 0.25,scale: 0.8  }, { x: -50, y: 290, rotation: -35, opacity: 1, scale: 1.2,  ease: 'power2.out' }, 0.06)
        .fromTo('.floating-right.item-10',{ x:  240, y: 0, rotation: -40, opacity: 0.3, scale: 0.75 }, { x: -25, y: 400, rotation:  30, opacity: 1, scale: 1.1,  ease: 'power2.out' }, 0.1)
        .fromTo('.floating-right.item-12',{ x:  310, y: 0, rotation:  35, opacity: 0.2, scale: 0.7  }, { x: -75, y: 200, rotation: -25, opacity: 1, scale: 1.25, ease: 'power2.out' }, 0.03)
        .to('.hero-banner-img', { scale: 1.04, ease: 'none' }, 0);

      // 5. Manifesto strip reveal (Safe & guaranteed visibility)
      const manifestoEl = wrapper.querySelector<HTMLElement>('.hero-manifesto-strip');
      if (manifestoEl) {
        gsap.fromTo(
          manifestoEl,
          { opacity: 0, y: 24 },
          {
            opacity: 1,
            y: 0,
            duration: 0.85,
            ease: 'power3.out',
            clearProps: 'all',
            scrollTrigger: {
              trigger: manifestoEl,
              start: 'top 95%',
              once: true,
              toggleActions: 'play none none none',
            },
          }
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
