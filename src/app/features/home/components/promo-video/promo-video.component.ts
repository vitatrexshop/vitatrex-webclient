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
import { PromoVideoSettings } from '../../../../core/models/settings.model';
import { environment } from '../../../../../environments/environment';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

@Component({
  selector: 'app-promo-video',
  templateUrl: './promo-video.component.html',
  styleUrls: ['./promo-video.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PromoVideoComponent implements OnInit, OnDestroy {
  @ViewChild('videoSection', { static: false }) sectionEl?: ElementRef<HTMLElement>;
  @ViewChild('videoEl', { static: false }) videoEl?: ElementRef<HTMLVideoElement>;

  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly settings = inject(SettingsService);

  private ctx?: gsap.Context;
  private isBrowser: boolean;

  isLoading = true;
  isPlaying = false;
  isMuted = true;
  hasError = false;
  promoVideo: PromoVideoSettings | null = null;

  // Reliable sample fallback if backend has no video uploaded yet
  readonly defaultVideo =
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
  readonly defaultPoster =
    'https://images.unsplash.com/photo-1550989460-0adf9ea622e2?auto=format&fit=crop&w=1200&q=80';

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    this.fetchData();
  }

  ngOnDestroy(): void {
    this.ctx?.revert();
    if (this.isBrowser) {
      ScrollTrigger.getAll().forEach((t) => t.kill());
    }
  }

  fetchData(): void {
    this.isLoading = true;
    this.cdr.markForCheck();

    this.settings
      .getPromoVideoSettings()
      .pipe(
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (data) => {
          this.promoVideo = data;
          this.isLoading = false;
          this.cdr.markForCheck();

          if (this.isBrowser) {
            setTimeout(() => {
              this.initScrollAnimation();
              this.tryAutoplay();
            }, 80);
          }
        },
        error: () => {
          this.isLoading = false;
          this.cdr.markForCheck();
        },
      });
  }

  get videoUrl(): string {
    const raw = this.promoVideo?.videoUrl?.trim();
    if (!raw) return this.defaultVideo;
    if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('blob:')) {
      return raw;
    }
    if (raw.startsWith('/uploads')) return `${environment.mediaBaseUrl}${raw}`;
    if (raw.startsWith('uploads')) return `${environment.mediaBaseUrl}/${raw}`;
    return raw;
  }

  get posterUrl(): string {
    const raw = this.promoVideo?.posterImageUrl?.trim();
    if (!raw) return this.defaultPoster;
    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      return raw;
    }
    if (raw.startsWith('/uploads')) return `${environment.mediaBaseUrl}${raw}`;
    if (raw.startsWith('uploads')) return `${environment.mediaBaseUrl}/${raw}`;
    return raw;
  }

  get videoTitle(): string {
    return this.promoVideo?.title?.trim() || '';
  }

  get videoSubtitle(): string {
    return this.promoVideo?.subtitle?.trim() || '';
  }

  get hasVideo(): boolean {
    return !!this.videoUrl;
  }

  tryAutoplay(): void {
    if (!this.videoEl?.nativeElement) return;
    const vid = this.videoEl.nativeElement;
    vid.muted = true;
    this.isMuted = true;
    const playPromise = vid.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          this.isPlaying = true;
          this.hasError = false;
          this.cdr.markForCheck();
        })
        .catch((err) => {
          console.warn('Initial autoplay prevented by browser policy:', err);
          this.isPlaying = false;
          this.cdr.markForCheck();
        });
    }
  }

  togglePlay(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    if (!this.videoEl?.nativeElement) return;
    const vid = this.videoEl.nativeElement;

    if (vid.paused || vid.ended) {
      const playPromise = vid.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            this.isPlaying = true;
            this.hasError = false;
            this.cdr.markForCheck();
          })
          .catch((err) => {
            console.warn('Unmuted play blocked, retrying muted:', err);
            vid.muted = true;
            this.isMuted = true;
            vid
              .play()
              .then(() => {
                this.isPlaying = true;
                this.hasError = false;
                this.cdr.markForCheck();
              })
              .catch((e) => {
                console.error('Play failed:', e);
                this.hasError = true;
                this.cdr.markForCheck();
              });
          });
      }
    } else {
      vid.pause();
      this.isPlaying = false;
      this.cdr.markForCheck();
    }
  }

  toggleMute(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    if (!this.videoEl?.nativeElement) return;
    const vid = this.videoEl.nativeElement;
    vid.muted = !vid.muted;
    this.isMuted = vid.muted;
    this.cdr.markForCheck();
  }

  onPlay(): void {
    this.isPlaying = true;
    this.hasError = false;
    this.cdr.markForCheck();
  }

  onPause(): void {
    this.isPlaying = false;
    this.cdr.markForCheck();
  }

  onVideoEnded(): void {
    this.isPlaying = false;
    this.cdr.markForCheck();
  }

  onVideoError(event: Event): void {
    console.error('HTML5 Video error:', event);
    this.hasError = true;
    this.isPlaying = false;
    this.cdr.markForCheck();
  }

  private initScrollAnimation(): void {
    if (!this.isBrowser || !this.sectionEl?.nativeElement) return;
    const section = this.sectionEl.nativeElement;

    this.ctx?.revert();

    // Safety fallback: if GSAP/ScrollTrigger doesn't fire within 1.5s, force container visible
    const safetyTimer = setTimeout(() => {
      const container = section.querySelector<HTMLElement>('.promo-video-container');
      if (container) {
        container.style.opacity = '1';
        container.style.transform = '';
      }
    }, 1500);

    this.ctx = gsap.context(() => {
      // 1. Entrance animation for the video container
      gsap.from('.promo-video-container', {
        opacity: 0,
        scale: 0.96,
        y: 30,
        duration: 0.8,
        ease: 'power2.out',
        clearProps: 'all',
        onComplete: () => clearTimeout(safetyTimer),
        scrollTrigger: {
          trigger: section,
          start: 'top 88%',
          once: true,
          toggleActions: 'play none none none',
          onEnter: () => clearTimeout(safetyTimer),
        },
      });

      // 2. Parallax floating fruit particles timeline with smooth scrub
      const scrollTl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1.2,
          invalidateOnRefresh: true,
        },
      });

      // Left floating items
      scrollTl.fromTo(
        '.float-left.pv-item-1',
        { y: -120, x: -40, rotation: -25, opacity: 0.2, scale: 0.8 },
        { y: 140, x: 25, rotation: 35, opacity: 1, scale: 1.15, ease: 'none' },
        0
      );
      scrollTl.fromTo(
        '.float-left.pv-item-2',
        { y: -160, x: -60, rotation: 30, opacity: 0.2, scale: 0.75 },
        { y: 190, x: 30, rotation: -40, opacity: 1, scale: 1.25, ease: 'none' },
        0.05
      );
      scrollTl.fromTo(
        '.float-left.pv-item-3',
        { y: -140, x: -30, rotation: -35, opacity: 0.2, scale: 0.8 },
        { y: 170, x: 20, rotation: 30, opacity: 1, scale: 1.2, ease: 'none' },
        0.1
      );
      scrollTl.fromTo(
        '.float-left.pv-item-4',
        { y: -180, x: -50, rotation: 40, opacity: 0.15, scale: 0.7 },
        { y: 210, x: 35, rotation: -30, opacity: 1, scale: 1.2, ease: 'none' },
        0.15
      );
      scrollTl.fromTo(
        '.float-left.pv-item-5',
        { y: -130, x: -35, rotation: -20, opacity: 0.2, scale: 0.85 },
        { y: 150, x: 20, rotation: 45, opacity: 1, scale: 1.15, ease: 'none' },
        0.2
      );

      // Right floating items
      scrollTl.fromTo(
        '.float-right.pv-item-6',
        { y: -130, x: 40, rotation: 25, opacity: 0.2, scale: 0.8 },
        { y: 150, x: -25, rotation: -35, opacity: 1, scale: 1.15, ease: 'none' },
        0
      );
      scrollTl.fromTo(
        '.float-right.pv-item-7',
        { y: -170, x: 60, rotation: -35, opacity: 0.2, scale: 0.75 },
        { y: 200, x: -35, rotation: 40, opacity: 1, scale: 1.25, ease: 'none' },
        0.05
      );
      scrollTl.fromTo(
        '.float-right.pv-item-8',
        { y: -150, x: 30, rotation: 30, opacity: 0.2, scale: 0.8 },
        { y: 180, x: -20, rotation: -30, opacity: 1, scale: 1.2, ease: 'none' },
        0.1
      );
      scrollTl.fromTo(
        '.float-right.pv-item-9',
        { y: -190, x: 50, rotation: -40, opacity: 0.15, scale: 0.7 },
        { y: 220, x: -40, rotation: 35, opacity: 1, scale: 1.2, ease: 'none' },
        0.15
      );
      scrollTl.fromTo(
        '.float-right.pv-item-10',
        { y: -140, x: 35, rotation: 20, opacity: 0.2, scale: 0.85 },
        { y: 160, x: -25, rotation: -45, opacity: 1, scale: 1.15, ease: 'none' },
        0.2
      );

      // 3. Editorial Statement Scroll Reveal (Safe & guaranteed visibility)
      const statementEl = section.querySelector<HTMLElement>('.promo-video-statement');
      if (statementEl) {
        gsap.fromTo(
          statementEl,
          { opacity: 0, y: 24 },
          {
            opacity: 1,
            y: 0,
            duration: 0.85,
            ease: 'power3.out',
            clearProps: 'all',
            scrollTrigger: {
              trigger: statementEl,
              start: 'top 95%',
              once: true,
              toggleActions: 'play none none none',
            },
          }
        );

        gsap.fromTo(
          '.sparkle-star',
          { scale: 0, opacity: 0, rotation: -45 },
          {
            scale: 1,
            opacity: 1,
            rotation: 0,
            duration: 0.6,
            stagger: 0.15,
            ease: 'back.out(2)',
            clearProps: 'all',
            scrollTrigger: {
              trigger: statementEl,
              start: 'top 95%',
              once: true,
            },
          }
        );

        gsap.fromTo(
          '.swoosh-path',
          { strokeDashoffset: 180 },
          {
            strokeDashoffset: 0,
            duration: 0.75,
            ease: 'power2.out',
            clearProps: 'strokeDashoffset',
            scrollTrigger: {
              trigger: statementEl,
              start: 'top 95%',
              once: true,
            },
          }
        );
      }
    }, section);
  }
}
