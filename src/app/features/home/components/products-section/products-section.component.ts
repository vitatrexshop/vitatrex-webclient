import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  Inject,
  inject,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  ViewChild,
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

  private swiper?: Swiper;
  private readonly isBrowser: boolean;

  isLoading = true;

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
  }

  ngAfterViewInit(): void {
    if (this.isBrowser && this.shelfProducts.length > 0) {
      setTimeout(() => this.initSwiper(), 60);
    }
  }

  ngOnDestroy(): void {
    this.swiper?.destroy(true, true);
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
            setTimeout(() => this.initSwiper(), 60);
          }
        },
        error: () => {
          this.buildShelfProducts([]);
          this.isLoading = false;
          this.cdr.markForCheck();
          if (this.isBrowser) {
            setTimeout(() => this.initSwiper(), 60);
          }
        },
      });
  }

  private buildShelfProducts(backendProds: Product[]): void {
    const items: HappyShelfItem[] = [...this.defaultShelfProducts];

    if (backendProds?.length) {
      backendProds.forEach((bp) => {
        const existingIdx = items.findIndex(
          (i) => i.slug === bp.slug || i.name.toLowerCase() === bp.name.toLowerCase()
        );
        if (existingIdx !== -1) {
          items[existingIdx].rawProduct = bp;
          if (bp.variants?.[0]?.price) {
            items[existingIdx].price = bp.variants[0].price;
          }
          const isAvailable =
            (bp as any).inStock !== false &&
            (bp.variants?.[0]?.stock === undefined ||
              bp.variants[0].stock > 0 ||
              bp.variants[0].stock === -1);
          items[existingIdx].inStock = isAvailable;
        }
      });
    }

    this.shelfProducts = items;
  }

  // ── Swiper Initialization ────────────────────────────────────
  private initSwiper(): void {
    const el = this.swiperEl?.nativeElement;
    if (!el || !this.isBrowser) return;
    const section = this.sectionEl?.nativeElement;

    this.swiper?.destroy(true, true);

    this.swiper = new Swiper(el, {
      modules: [Navigation, Pagination, Autoplay],
      loop: this.shelfProducts.length >= 3,
      slidesPerView: 5,
      spaceBetween: 24,
      speed: 600,
      grabCursor: true,
      watchSlidesProgress: true,
      autoplay: {
        delay: 2500,
        disableOnInteraction: false,
        pauseOnMouseEnter: true,
      },
      navigation: {
        nextEl: section?.querySelectorAll<HTMLElement>('.shelf-nav-btn--next') as any ?? '.shelf-nav-btn--next',
        prevEl: section?.querySelectorAll<HTMLElement>('.shelf-nav-btn--prev') as any ?? '.shelf-nav-btn--prev',
      },
      pagination: {
        el: section?.querySelector<HTMLElement>('.shelf-dots') ?? '.shelf-dots',
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
    });
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

