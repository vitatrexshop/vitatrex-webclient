import {
  Component,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  HostListener,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Inject,
  PLATFORM_ID,
  inject,
  DestroyRef,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { StoryService } from '../../../../core/services/story.service';
import { Story } from '../../../../core/models/story.model';
import { environment } from '../../../../../environments/environment';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

@Component({
  selector: 'app-video-stories',
  templateUrl: './video-stories.component.html',
  styleUrls: ['./video-stories.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VideoStoriesComponent implements OnInit, OnDestroy {
  @ViewChild('storiesTrack', { static: false }) storiesTrackEl?: ElementRef<HTMLElement>;
  @ViewChild('storiesSection', { static: false }) sectionEl?: ElementRef<HTMLElement>;
  @ViewChild('reelVideo', { static: false }) reelVideoEl?: ElementRef<HTMLVideoElement>;
  @ViewChild('modalElement', { static: false }) set modalRef(el: ElementRef<HTMLElement> | undefined) {
    if (el?.nativeElement && this.isBrowser) {
      if (el.nativeElement.parentElement !== document.body) {
        document.body.appendChild(el.nativeElement);
      }
    }
  }

  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly storyService = inject(StoryService);
  private readonly router = inject(Router);

  private ctx?: gsap.Context;
  private isBrowser: boolean;

  isLoading = true;
  stories: Story[] = [];
  readonly skeletonItems = [1, 2, 3, 4, 5];

  /** Track poster URLs that have errored so we don't infinite loop and can show fallback */
  private brokenPosters = new Set<string>();

  // Modal Reel State
  isModalOpen = false;
  activeStoryIndex = 0;
  isPlaying = true;
  isMuted = true;
  fitMode: 'contain' | 'cover' = 'contain';
  videoProgress = 0;
  hasVideoError = false;
  showPlayPauseFeedback: 'play' | 'pause' | null = null;
  private feedbackTimeout?: any;

  // Touch navigation
  private touchStartX = 0;
  private touchStartY = 0;

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    this.fetchStories();
  }

  ngOnDestroy(): void {
    this.brokenPosters.clear();
    if (this.feedbackTimeout) {
      clearTimeout(this.feedbackTimeout);
    }
    const modalEl = document.querySelector('.story-reel-modal');
    if (modalEl && modalEl.parentElement === document.body) {
      document.body.removeChild(modalEl);
    }
    this.ctx?.revert();
    if (this.isBrowser) {
      ScrollTrigger.getAll().forEach((t) => t.kill());
      document.body.style.overflow = '';
    }
  }

  fetchStories(): void {
    this.isLoading = true;
    this.cdr.markForCheck();

    this.storyService
      .getStories()
      .pipe(
        catchError((err) => {
          console.warn('[VideoStories] API fetch error:', err);
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (res) => {
          if (res && res.success && Array.isArray(res.data)) {
            // Filter only active items and sort by order
            this.stories = res.data
              .filter((s) => s.isActive !== false && s.isActive !== null)
              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          } else if (Array.isArray(res)) {
            this.stories = (res as Story[])
              .filter((s) => s.isActive !== false && s.isActive !== null)
              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          } else {
            this.stories = [];
          }

          this.isLoading = false;
          this.cdr.markForCheck();
          this.cdr.detectChanges();

          if (this.isBrowser && this.stories.length > 0) {
            setTimeout(() => {
              this.initScrollAnimation();
              ScrollTrigger.refresh();
            }, 80);
          }
        },
        error: () => {
          this.stories = [];
          this.isLoading = false;
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        },
      });
  }

  get currentStory(): Story | null {
    return this.stories[this.activeStoryIndex] || null;
  }

  trackByStoryId(index: number, story: Story): string {
    return story._id || String(index);
  }

  formatMediaUrl(url?: string): string {
    if (!url) return '';
    const raw = url.trim();
    if (
      raw.startsWith('http://') ||
      raw.startsWith('https://') ||
      raw.startsWith('blob:') ||
      raw.startsWith('data:') ||
      raw.startsWith('assets/')
    ) {
      // Resize Unsplash thumbnails to match the 295px card container
      return this.optimizeUnsplashUrl(raw);
    }
    if (raw.startsWith('/uploads')) return `${environment.mediaBaseUrl}${raw}`;
    if (raw.startsWith('uploads')) return `${environment.mediaBaseUrl}/${raw}`;
    return `${environment.mediaBaseUrl}/${raw}`;
  }

  /**
   * Rewrites any Unsplash image URL so the w= query param matches the
   * 295px card container, preventing oversized downloads.
   */
  private optimizeUnsplashUrl(url: string, width = 300): string {
    if (!url || !url.includes('images.unsplash.com')) return url;
    if (/[?&]w=/.test(url)) {
      return url.replace(/([?&]w=)\d+/, `$1${width}`);
    }
    return url + (url.includes('?') ? `&w=${width}` : `?w=${width}`);
  }


  formatVideoUrl(url?: string): string {
    if (!url) return '';
    const raw = url.trim();
    if (
      raw.startsWith('http://') ||
      raw.startsWith('https://') ||
      raw.startsWith('blob:')
    ) {
      return raw;
    }
    if (raw.startsWith('/uploads')) return `${environment.mediaBaseUrl}${raw}`;
    if (raw.startsWith('uploads')) return `${environment.mediaBaseUrl}/${raw}`;
    return `${environment.mediaBaseUrl}/${raw}`;
  }

  onPosterError(event: Event, posterUrl?: string): void {
    if (posterUrl) {
      this.brokenPosters.add(posterUrl);
    }
    const img = event.target as HTMLImageElement;
    if (img && img.src) {
      this.brokenPosters.add(img.src);
    }
    this.cdr.markForCheck();
  }

  isBrokenPoster(posterUrl?: string): boolean {
    if (!posterUrl) return true;
    return this.brokenPosters.has(posterUrl) || this.brokenPosters.has(this.formatMediaUrl(posterUrl));
  }

  onVideoError(event: Event): void {
    console.warn('[VideoStories] Video playback error:', event);
    this.hasVideoError = true;
    this.isPlaying = false;
    this.cdr.markForCheck();
  }

  // ── Stories Bar Scroll Navigation ──────────────────────────
  scrollTrack(direction: 'left' | 'right'): void {
    if (!this.storiesTrackEl?.nativeElement) return;
    const track = this.storiesTrackEl.nativeElement;
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
    const amount = isMobile ? Math.min(window.innerWidth * 0.75, 240) : 320;
    track.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth',
    });
  }

  // ── Reel Modal Actions ─────────────────────────────────────
  toggleFitMode(event?: Event): void {
    if (event) event.stopPropagation();
    this.fitMode = this.fitMode === 'contain' ? 'cover' : 'contain';
    this.cdr.markForCheck();
  }

  openStory(index: number): void {
    this.activeStoryIndex = index;
    this.isModalOpen = true;
    this.videoProgress = 0;
    this.isPlaying = true;
    this.isMuted = true;
    this.hasVideoError = false;
    this.cdr.markForCheck();

    if (this.isBrowser) {
      document.body.style.overflow = 'hidden';
      setTimeout(() => {
        if (this.reelVideoEl?.nativeElement) {
          const vid = this.reelVideoEl.nativeElement;
          vid.load();
        }
        this.playActiveVideo();
      }, 100);
    }
  }

  closeModal(): void {
    if (this.reelVideoEl?.nativeElement) {
      this.reelVideoEl.nativeElement.pause();
    }
    const modalEl = document.querySelector('.story-reel-modal');
    if (modalEl && modalEl.parentElement === document.body) {
      document.body.removeChild(modalEl);
    }
    this.isModalOpen = false;
    this.videoProgress = 0;
    this.hasVideoError = false;
    this.cdr.markForCheck();

    if (this.isBrowser) {
      document.body.style.overflow = '';
    }
  }

  nextStory(event?: Event): void {
    if (event) event.stopPropagation();
    if (this.activeStoryIndex < this.stories.length - 1) {
      this.activeStoryIndex++;
      this.videoProgress = 0;
      this.isPlaying = true;
      this.hasVideoError = false;
      this.cdr.markForCheck();
      setTimeout(() => {
        if (this.reelVideoEl?.nativeElement) {
          const vid = this.reelVideoEl.nativeElement;
          vid.load();
        }
        this.playActiveVideo();
      }, 50);
    } else {
      this.closeModal();
    }
  }

  prevStory(event?: Event): void {
    if (event) event.stopPropagation();
    if (this.activeStoryIndex > 0) {
      this.activeStoryIndex--;
      this.videoProgress = 0;
      this.isPlaying = true;
      this.hasVideoError = false;
      this.cdr.markForCheck();
      setTimeout(() => {
        if (this.reelVideoEl?.nativeElement) {
          const vid = this.reelVideoEl.nativeElement;
          vid.load();
        }
        this.playActiveVideo();
      }, 50);
    }
  }

  togglePlay(event?: Event): void {
    if (event) event.stopPropagation();
    if (this.hasVideoError) return;
    if (!this.reelVideoEl?.nativeElement) return;
    const vid = this.reelVideoEl.nativeElement;

    if (vid.paused || vid.ended) {
      const p = vid.play();
      if (p !== undefined) {
        p.then(() => {
          this.isPlaying = true;
          this.triggerFeedback('play');
          this.cdr.markForCheck();
        }).catch((e) => {
          console.warn('Unmuted play blocked, retrying muted:', e);
          vid.muted = true;
          this.isMuted = true;
          vid
            .play()
            .then(() => {
              this.isPlaying = true;
              this.triggerFeedback('play');
              this.cdr.markForCheck();
            })
            .catch(() => {});
        });
      }
    } else {
      vid.pause();
      this.isPlaying = false;
      this.triggerFeedback('pause');
      this.cdr.markForCheck();
    }
  }

  toggleMute(event?: Event): void {
    if (event) event.stopPropagation();
    if (!this.reelVideoEl?.nativeElement) return;
    const vid = this.reelVideoEl.nativeElement;
    vid.muted = !vid.muted;
    this.isMuted = vid.muted;
    this.cdr.markForCheck();
  }

  onVideoPlay(): void {
    this.isPlaying = true;
    this.hasVideoError = false;
    this.cdr.markForCheck();
  }

  onVideoPause(): void {
    this.isPlaying = false;
    this.cdr.markForCheck();
  }

  onVideoTimeUpdate(): void {
    if (!this.reelVideoEl?.nativeElement) return;
    const vid = this.reelVideoEl.nativeElement;
    if (vid.duration && !isNaN(vid.duration) && vid.duration > 0) {
      this.videoProgress = (vid.currentTime / vid.duration) * 100;
      this.cdr.markForCheck();
    }
  }

  onVideoEnded(): void {
    this.nextStory();
  }

  onVideoLoaded(): void {
    this.hasVideoError = false;
    this.playActiveVideo();
  }

  private playActiveVideo(): void {
    if (!this.isBrowser || this.hasVideoError) return;

    setTimeout(() => {
      if (!this.reelVideoEl?.nativeElement) return;
      const vid = this.reelVideoEl.nativeElement;
      vid.muted = this.isMuted;
      vid.defaultMuted = true;

      const p = vid.play();
      if (p !== undefined) {
        p.then(() => {
          this.isPlaying = true;
          this.hasVideoError = false;
          this.cdr.markForCheck();
        }).catch((err) => {
          console.warn('Initial autoplay restricted, applying muted autoplay:', err);
          vid.muted = true;
          this.isMuted = true;
          vid
            .play()
            .then(() => {
              this.isPlaying = true;
              this.hasVideoError = false;
              this.cdr.markForCheck();
            })
            .catch((e) => {
              console.warn('Play prevented:', e);
              this.isPlaying = false;
              this.cdr.markForCheck();
            });
        });
      }
    }, 60);
  }

  private triggerFeedback(type: 'play' | 'pause'): void {
    this.showPlayPauseFeedback = type;
    if (this.feedbackTimeout) {
      clearTimeout(this.feedbackTimeout);
    }
    this.feedbackTimeout = setTimeout(() => {
      this.showPlayPauseFeedback = null;
      this.cdr.markForCheck();
    }, 600);
  }

  navigateToProduct(productLink?: string, event?: Event): void {
    if (event) event.stopPropagation();
    this.closeModal();

    // Double-sanitize the link in case it came from an old cached response
    const sanitized = this.storyService.sanitizeProductLink(productLink);

    if (!sanitized) {
      this.router.navigate(['/products']);
      return;
    }

    // After sanitization, any remaining http/https absolute URL is intentionally external
    if (sanitized.startsWith('http://') || sanitized.startsWith('https://')) {
      window.open(sanitized, '_blank');
    } else {
      this.router.navigate([sanitized]);
    }
  }

  // ── Keyboard Navigation ────────────────────────────────────
  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    if (!this.isModalOpen) return;

    switch (event.key) {
      case 'Escape':
        this.closeModal();
        break;
      case 'ArrowRight':
        this.nextStory();
        break;
      case 'ArrowLeft':
        this.prevStory();
        break;
      case ' ':
        event.preventDefault();
        this.togglePlay();
        break;
      case 'm':
      case 'M':
        this.toggleMute();
        break;
      case 'f':
      case 'F':
        this.toggleFitMode();
        break;
    }
  }

  // ── Mobile Swipe Touch Gestures ────────────────────────────
  onTouchStart(event: TouchEvent): void {
    if (event.touches.length === 1) {
      this.touchStartX = event.touches[0].clientX;
      this.touchStartY = event.touches[0].clientY;
    }
  }

  onTouchEnd(event: TouchEvent): void {
    if (event.changedTouches.length === 1) {
      const touchEndX = event.changedTouches[0].clientX;
      const touchEndY = event.changedTouches[0].clientY;
      const diffX = touchEndX - this.touchStartX;
      const diffY = touchEndY - this.touchStartY;

      // Vertical swipe down to close
      if (diffY > 60 && Math.abs(diffY) > Math.abs(diffX) * 1.2) {
        this.closeModal();
        return;
      }

      // Horizontal swipe (left/right)
      if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY) * 1.2) {
        if (diffX > 0) {
          this.prevStory();
        } else {
          this.nextStory();
        }
      }
    }
  }

  // ── GSAP ScrollTrigger Entrance Animation ─────────────────
  private initScrollAnimation(): void {
    if (!this.isBrowser || !this.sectionEl?.nativeElement) return;
    const section = this.sectionEl.nativeElement;

    this.ctx?.revert();

    // Ensure baseline visibility immediately
    const header = section.querySelector<HTMLElement>('.stories-section-header');
    if (header) {
      header.style.opacity = '1';
    }
    const cards = section.querySelectorAll<HTMLElement>('.story-reel-card');
    cards.forEach((c) => {
      c.style.opacity = '1';
    });

    this.ctx = gsap.context(() => {
      // Subtle smooth entrance without ever hiding elements
      if (header) {
        gsap.fromTo(
          header,
          { opacity: 0.85, y: 15 },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: 'power2.out',
            clearProps: 'all',
          }
        );
      }

      if (cards.length > 0) {
        gsap.fromTo(
          cards,
          { opacity: 0.85, y: 15 },
          {
            opacity: 1,
            y: 0,
            duration: 0.5,
            stagger: 0.05,
            ease: 'power2.out',
            clearProps: 'all',
          }
        );
      }
    }, section);
  }
}