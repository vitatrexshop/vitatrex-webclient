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

  // Modal Reel State
  isModalOpen = false;
  activeStoryIndex = 0;
  isPlaying = true;
  isMuted = true;
  fitMode: 'contain' | 'cover' = 'contain';
  videoProgress = 0;
  showPlayPauseFeedback: 'play' | 'pause' | null = null;
  private feedbackTimeout?: any;

  // Touch navigation
  private touchStartX = 0;
  private touchStartY = 0;

  // Fallback demo stories if API has no active items yet
  readonly fallbackStories: Story[] = [
    {
      _id: 'demo-1',
      title: 'طاقة ونشاط طوال اليوم ⚡',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      posterUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80',
      productLink: '/products',
      isActive: true,
      order: 1,
    },
    {
      _id: 'demo-2',
      title: 'نوم عميق ومريح كل ليلة 🌙',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      posterUrl: 'https://images.unsplash.com/photo-1550989460-0adf9ea622e2?auto=format&fit=crop&w=600&q=80',
      productLink: '/products',
      isActive: true,
      order: 2,
    },
    {
      _id: 'demo-3',
      title: 'مناعة قوية ونشاط دائم 🛡️',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
      posterUrl: 'https://images.unsplash.com/photo-1576602976047-174e57a47881?auto=format&fit=crop&w=600&q=80',
      productLink: '/products',
      isActive: true,
      order: 3,
    },
    {
      _id: 'demo-4',
      title: 'بشرة نضرة وشعر صحي ✨',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
      posterUrl: 'https://images.unsplash.com/photo-1512290900672-1f02e6005b76?auto=format&fit=crop&w=600&q=80',
      productLink: '/products',
      isActive: true,
      order: 4,
    },
    {
      _id: 'demo-5',
      title: 'فيتامينات طبيعية للأطفال 🍓',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
      posterUrl: 'https://images.unsplash.com/photo-1556911073-38141963c9e0?auto=format&fit=crop&w=600&q=80',
      productLink: '/products',
      isActive: true,
      order: 5,
    },
  ];

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    this.fetchStories();
  }

  ngOnDestroy(): void {
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
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (res) => {
          if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
            const active = res.data.filter((s) => s.isActive !== false);
            if (active.length > 0 && active.length < 4) {
              this.stories = [...active, ...this.fallbackStories.slice(active.length)];
            } else if (active.length > 0) {
              this.stories = active;
            } else {
              this.stories = this.fallbackStories;
            }
          } else {
            this.stories = this.fallbackStories;
          }
          this.isLoading = false;
          this.cdr.markForCheck();

          if (this.isBrowser) {
            setTimeout(() => this.initScrollAnimation(), 80);
          }
        },
        error: () => {
          this.stories = this.fallbackStories;
          this.isLoading = false;
          this.cdr.markForCheck();

          if (this.isBrowser) {
            setTimeout(() => this.initScrollAnimation(), 80);
          }
        },
      });
  }

  get currentStory(): Story | null {
    return this.stories[this.activeStoryIndex] || null;
  }

  formatMediaUrl(url?: string): string {
    if (!url) return '';
    const raw = url.trim();
    if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('blob:')) {
      return raw;
    }
    if (raw.startsWith('/uploads')) return `http://localhost:5000${raw}`;
    if (raw.startsWith('uploads')) return `http://localhost:5000/${raw}`;
    return raw;
  }

  formatVideoUrl(url?: string): string {
    const fallback = this.fallbackStories[this.activeStoryIndex % this.fallbackStories.length].videoUrl;
    if (!url) return fallback;
    const raw = url.trim();
    if (!raw) return fallback;
    const lower = raw.toLowerCase();
    if (
      lower.endsWith('.jpg') ||
      lower.endsWith('.jpeg') ||
      lower.endsWith('.png') ||
      lower.endsWith('.webp') ||
      lower.endsWith('.avif')
    ) {
      return fallback;
    }
    if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('blob:')) {
      return raw;
    }
    if (raw.startsWith('/uploads')) return `http://localhost:5000${raw}`;
    if (raw.startsWith('uploads')) return `http://localhost:5000/${raw}`;
    return `http://localhost:5000/${raw}`;
  }

  onPosterError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img && this.fallbackStories.length > 0) {
      img.src = this.fallbackStories[0].posterUrl;
    }
  }

  onVideoError(event: Event): void {
    console.warn('Story video error, switching to reliable sample video stream:', event);
    const vid = this.reelVideoEl?.nativeElement;
    const fallback = this.fallbackStories[this.activeStoryIndex % this.fallbackStories.length].videoUrl;
    if (vid && vid.src !== fallback) {
      vid.src = fallback;
      vid.load();
      this.playActiveVideo();
    }
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
          vid.play()
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
    this.playActiveVideo();
  }

  private playActiveVideo(): void {
    if (!this.isBrowser) return;

    setTimeout(() => {
      if (!this.reelVideoEl?.nativeElement) return;
      const vid = this.reelVideoEl.nativeElement;
      vid.muted = this.isMuted;
      vid.defaultMuted = true;

      const p = vid.play();
      if (p !== undefined) {
        p.then(() => {
          this.isPlaying = true;
          this.cdr.markForCheck();
        }).catch((err) => {
          console.warn('Initial autoplay restricted, applying muted autoplay:', err);
          vid.muted = true;
          this.isMuted = true;
          vid.play()
            .then(() => {
              this.isPlaying = true;
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
    if (!productLink) {
      this.router.navigate(['/products']);
      return;
    }
    if (productLink.startsWith('http://') || productLink.startsWith('https://')) {
      window.open(productLink, '_blank');
    } else {
      this.router.navigate([productLink]);
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

    // Safety fallback: if GSAP/ScrollTrigger doesn't fire within 2s, force cards visible
    const safetyTimer = setTimeout(() => {
      const cards = section.querySelectorAll<HTMLElement>('.story-reel-card');
      cards.forEach((c) => {
        c.style.opacity = '1';
        c.style.transform = '';
      });
    }, 2000);

    this.ctx = gsap.context(() => {
      // Header entrance
      gsap.from('.stories-section-header', {
        opacity: 0,
        y: 25,
        duration: 0.8,
        ease: 'power3.out',
        clearProps: 'all',
        scrollTrigger: {
          trigger: section,
          start: 'top 85%',
          once: true,
          toggleActions: 'play none none none',
        },
      });

      // Stagger Instagram Reel Cards
      gsap.from('.story-reel-card', {
        opacity: 0,
        y: 35,
        scale: 0.92,
        duration: 0.7,
        stagger: 0.08,
        ease: 'power3.out',
        clearProps: 'all',
        onComplete: () => clearTimeout(safetyTimer),
        scrollTrigger: {
          trigger: section,
          start: 'top 82%',
          once: true,
          toggleActions: 'play none none none',
          onEnter: () => clearTimeout(safetyTimer),
        },
      });
    }, section);
  }
}