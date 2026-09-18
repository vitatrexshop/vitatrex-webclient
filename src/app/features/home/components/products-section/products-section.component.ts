import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  Inject,
  inject,
  NgZone,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import Swiper from 'swiper';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import { ProductService } from '../../../../core/services/product.service';
import { CartService } from '../../../../core/services/cart.service';
import { ToastService } from '../../../../core/services/toast.service';
import { TranslateService } from '@ngx-translate/core';
import { Product } from '../../../../core/models/product.model';

export interface HappyShelfItem {
  _id: string;
  name: string;
  slug: string;
  price: number;
  originalPrice?: number | null;
  image: string;
  inStock: boolean;
  category?: string;
  rawProduct?: Product;
}

@Component({
  selector: 'app-products-section',
  templateUrl: './products-section.component.html',
  styleUrls: ['./products-section.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class ProductsSectionComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('sectionEl', { static: false }) sectionEl?: ElementRef<HTMLElement>;
  @ViewChild('swiperEl', { static: false }) swiperEl?: ElementRef<HTMLElement>;

  private readonly productService = inject(ProductService);
  private readonly cartService    = inject(CartService);
  private readonly toastService   = inject(ToastService);
  private readonly translate      = inject(TranslateService);
  private readonly cdr            = inject(ChangeDetectorRef);
  private readonly destroyRef     = inject(DestroyRef);
  private readonly ngZone         = inject(NgZone);

  private swiper?: Swiper;
  private readonly isBrowser: boolean;

  isLoading = true;
  isTransitioning = false;

  private navTransitionTimer?: ReturnType<typeof setTimeout>;
  private resizeTimer?: ReturnType<typeof setTimeout>;
  private resizeObserver?: ResizeObserver;

  // ── Default shelf products (curated reference items) ─────────
  readonly defaultShelfProducts: HappyShelfItem[] = [
    {
      _id: 'shelf-maternal-01',
      name: 'Maternal Multi',
      slug: 'maternal-multi',
      price: 430.00,
      image: 'assets/bottles/maternal-multi.webp',
      inStock: false,
      category: 'maternal',
    },
    {
      _id: 'shelf-sleep-02',
      name: 'Sleep',
      slug: 'sleep',
      price: 430.00,
      image: 'assets/bottles/sleep.webp',
      inStock: true,
      category: 'sleep',
    },
    {
      _id: 'shelf-mens50-03',
      name: "Men's 50+ Multi",
      slug: 'mens-50-multi',
      price: 410.00,
      image: 'assets/bottles/mens-50-multi.webp',
      inStock: true,
      category: 'immunity',
    },
    {
      _id: 'shelf-womens-04',
      name: "Women's Multi",
      slug: 'womens-multi',
      price: 410.00,
      image: 'assets/bottles/womens-multi.webp',
      inStock: true,
      category: 'women',
    },
    {
      _id: 'shelf-mens-05',
      name: "Men's Multi",
      slug: 'mens-multi',
      price: 410.00,
      image: 'assets/bottles/mens-multi.webp',
      inStock: true,
      category: 'energy',
    },
  ];

  shelfProducts: HappyShelfItem[] = [];

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  // ── Lifecycle ────────────────────────────────────────────────
  ngOnInit(): void {
    this.fetchProducts();
    this.translate.onLangChange
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.cdr.markForCheck();
      });
  }

  ngAfterViewInit(): void {
    if (this.isBrowser) {
      if (typeof window !== 'undefined') {
        window.addEventListener('load', () => {
          this.ngZone.runOutsideAngular(() => {
            this.swiper?.update();
          });
        }, { once: true });
      }
      if (this.shelfProducts.length > 0) {
        setTimeout(() => this.ngZone.runOutsideAngular(() => {
          this.initSwiper();
          this.swiper?.update();
        }), 60);
      }
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    if (this.resizeTimer) clearTimeout(this.resizeTimer);
    if (this.navTransitionTimer) clearTimeout(this.navTransitionTimer);
    this.swiper?.destroy(true, true);
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.handleResize();
  }

  private handleResize(): void {
    if (!this.isBrowser || !this.swiper) return;
    if (this.resizeTimer) clearTimeout(this.resizeTimer);
    this.resizeTimer = setTimeout(() => {
      this.ngZone.runOutsideAngular(() => {
        if (this.swiper && !this.swiper.destroyed) {
          this.swiper.updateSize();
          this.swiper.updateSlides();
          this.swiper.updateProgress();
          this.swiper.update();
        }
      });
    }, 120);
  }

  private setupResizeObserver(): void {
    if (!this.isBrowser || typeof ResizeObserver === 'undefined') return;
    this.resizeObserver?.disconnect();
    const el = this.swiperEl?.nativeElement;
    if (!el) return;
    this.resizeObserver = new ResizeObserver(() => {
      this.handleResize();
    });
    this.resizeObserver.observe(el);
  }

  // ── Data Loading ─────────────────────────────────────────────
  fetchProducts(): void {
    this.isLoading = true;
    this.cdr.markForCheck();

    this.productService
      .getProducts()
      .pipe(
        catchError(() => of([])),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (backendProds) => {
          this.buildShelfProducts(backendProds);
          this.isLoading = false;
          this.cdr.markForCheck();
          if (this.isBrowser) {
            setTimeout(() => this.ngZone.runOutsideAngular(() => {
              this.initSwiper();
              this.swiper?.update();
            }), 60);
            setTimeout(() => this.ngZone.runOutsideAngular(() => {
              this.swiper?.update();
            }), 350);
          }
        },
        error: () => {
          this.buildShelfProducts([]);
          this.isLoading = false;
          this.cdr.markForCheck();
          if (this.isBrowser) {
            setTimeout(() => this.ngZone.runOutsideAngular(() => {
              this.initSwiper();
              this.swiper?.update();
            }), 60);
            setTimeout(() => this.ngZone.runOutsideAngular(() => {
              this.swiper?.update();
            }), 350);
          }
        },
      });
  }

  private buildShelfProducts(backendProds: Product[]): void {
    // ── Primary path: real products from the API ──────────────────
    if (backendProds?.length) {
      this.shelfProducts = backendProds.map((bp): HappyShelfItem => {
        const variant    = bp.variants?.[0];
        const price      = variant?.price ?? 0;
        const origPrice  = variant?.originalPrice && variant.originalPrice > price
          ? variant.originalPrice
          : null;
        const isAvailable =
          (bp as any).inStock !== false &&
          (variant?.stock === undefined || variant.stock > 0 || variant.stock === -1);

        // Prefer the first image; fall back through available fields
        const image =
          (bp.images && bp.images.length > 0 ? bp.images[0] : null) ??
          (bp as any).image ??
          'assets/images/hero-fallback.webp';

        return {
          _id:           bp._id ?? bp.slug,
          name:          bp.name,
          slug:          bp.slug,
          price,
          originalPrice: origPrice,
          image,
          inStock:       isAvailable,
          category:      (bp as any).category ?? '',
          rawProduct:    bp,
        };
      });
      return;
    }

    // ── Fallback path: hardcoded defaults when API is empty/failed ─
    this.shelfProducts = [...this.defaultShelfProducts];
  }


  // ── Swiper Initialization ────────────────────────────────────
  private initSwiper(): void {
    const el = this.swiperEl?.nativeElement;
    if (!el || !this.isBrowser) return;

    this.swiper?.destroy(true, true);

    this.swiper = new Swiper(el, {
      modules: [Navigation, Pagination, Autoplay],
      loop: false,
      rewind: this.shelfProducts.length > 1,
      slidesPerView: 5,
      spaceBetween: 24,
      speed: 500,
      grabCursor: true,
      preventInteractionOnTransition: true, // Blocks rapid touches and transitions
      threshold: 8,
      touchAngle: 45,
      watchSlidesProgress: true,
      observer: true,
      observeParents: true,
      observeSlideChildren: true,
      resizeObserver: true,
      updateOnWindowResize: true,
      autoplay: {
        delay: 3500,
        disableOnInteraction: false,
        pauseOnMouseEnter: true,
      },
      pagination: {
        el: el.parentElement?.querySelector<HTMLElement>('.shelf-dots') ?? '.shelf-dots',
        clickable: true,
        bulletClass: 'shelf-dot',
        bulletActiveClass: 'is-active',
      },
      breakpoints: {
        0: {
          slidesPerView: 1.5,
          spaceBetween: 12,
        },
        480: {
          slidesPerView: 2,
          spaceBetween: 14,
        },
        768: {
          slidesPerView: 3,
          spaceBetween: 18,
        },
        992: {
          slidesPerView: 4,
          spaceBetween: 20,
        },
        1200: {
          slidesPerView: 5,
          spaceBetween: 24,
        },
      },
      on: {
        slideChangeTransitionStart: () => {
          this.ngZone.run(() => {
            this.isTransitioning = true;
            this.cdr.markForCheck();
          });
        },
        slideChangeTransitionEnd: () => {
          this.ngZone.run(() => {
            this.isTransitioning = false;
            this.cdr.markForCheck();
          });
        },
        touchStart: () => {
          if (this.isTransitioning && this.swiper) {
            this.swiper.allowTouchMove = false;
          } else if (this.swiper) {
            this.swiper.allowTouchMove = true;
          }
        },
        touchEnd: () => {
          if (this.swiper) {
            this.swiper.allowTouchMove = true;
          }
        },
      },
    });

    this.swiper.update();
    setTimeout(() => {
      this.swiper?.update();
    }, 100);

    this.setupResizeObserver();
  }

  // ── Debounced Navigation Handlers ────────────────────────────

  onNextClick(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (this.isTransitioning || !this.swiper) return;
    this.lockTransition();
    this.swiper.slideNext(500);
  }

  onPrevClick(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (this.isTransitioning || !this.swiper) return;
    this.lockTransition();
    this.swiper.slidePrev(500);
  }

  private lockTransition(duration = 520): void {
    this.isTransitioning = true;
    this.cdr.markForCheck();
    if (this.navTransitionTimer) clearTimeout(this.navTransitionTimer);
    this.navTransitionTimer = setTimeout(() => {
      this.isTransitioning = false;
      this.cdr.markForCheck();
    }, duration);
  }

  // ── Add to Cart & Notify Handlers ────────────────────────────
  onNotifyMe(item: HappyShelfItem, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    const msg =
      this.translate.currentLang === 'ar'
        ? `سنقوم بإشعارك فور توفر "${item.name}"!`
        : `We'll notify you as soon as "${item.name}" is back in stock!`;
    this.toastService.success(msg);
  }

  onAddToCart(item: HappyShelfItem, event: Event): void {
    event.stopPropagation();
    event.preventDefault();

    if (!item.inStock) {
      this.onNotifyMe(item, event);
      return;
    }

    if (item.rawProduct?.variants?.[0]) {
      this.cartService.addToCart(item.rawProduct, item.rawProduct.variants[0], 1);
    } else {
      const synthProduct: Product = {
        _id: item._id,
        name: item.name,
        slug: item.slug,
        category: item.category || 'all',
        description: item.name,
        benefits: [],
        isBestSeller: false,
        isFeatured: true,
        image: item.image,
        isActive: true,
        variants: [
          {
            _id: `var-${item._id}`,
            count: 60,
            price: item.price,
            originalPrice: item.originalPrice ?? null,
            discountPercentage: 0,
            stock: 50,
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.cartService.addToCart(synthProduct, synthProduct.variants[0], 1);
    }

    const msg =
      this.translate.currentLang === 'ar'
        ? `تمت إضافة "${item.name}" إلى السلة ✓`
        : `Added "${item.name}" to your cart ✓`;
    this.toastService.success(msg);
  }

  trackByShelfId(_: number, item: HappyShelfItem): string {
    return item._id;
  }
}

