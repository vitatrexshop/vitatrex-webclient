import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
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

// ── Autoplay Configuration ────────────────────────────────────
const AUTOPLAY_DELAY_MS = 3000; // 3 s per step (matches Swiper spec)
const AUTOPLAY_STEP_PX  = 280;  // px scrolled per autoplay tick

@Component({
  selector: 'app-products-section',
  templateUrl: './products-section.component.html',
  styleUrls: ['./products-section.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductsSectionComponent implements OnInit, OnDestroy {
  @ViewChild('shelfTrack', { static: false }) shelfTrack?: ElementRef<HTMLDivElement>;

  private readonly productService = inject(ProductService);
  private readonly cartService    = inject(CartService);
  private readonly toastService   = inject(ToastService);
  private readonly translate      = inject(TranslateService);
  private readonly cdr            = inject(ChangeDetectorRef);
  private readonly destroyRef     = inject(DestroyRef);

  isLoading = true;
  scrollProgress = 0;
  canScrollPrev = false;
  canScrollNext = true;

  // Autoplay internal state
  private autoplayTimer: ReturnType<typeof setInterval> | null = null;
  private isHovered = false;      // tracks section-level hover
  private isCardHovered = false;  // tracks individual card hover

  // ── Default shelf products (exact reference mockup) ─────────
  readonly defaultShelfProducts: HappyShelfItem[] = [
    {
      _id: 'shelf-maternal-01',
      name: 'Maternal Multi',
      slug: 'maternal-multi',
      price: 430.00,
      image: 'assets/bottles/maternal-multi.png',
      inStock: false,
      category: 'maternal',
    },
    {
      _id: 'shelf-mens-02',
      name: "Men's Multi",
      slug: 'mens-multi',
      price: 410.00,
      image: 'assets/bottles/mens-multi.png',
      inStock: true,
      category: 'energy',
    },
    {
      _id: 'shelf-womens-03',
      name: "Women's Multi",
      slug: 'womens-multi',
      price: 410.00,
      image: 'assets/bottles/womens-multi.png',
      inStock: true,
      category: 'women',
    },
    {
      _id: 'shelf-mens50-04',
      name: "Men's 50+ Multi",
      slug: 'mens-50-multi',
      price: 410.00,
      image: 'assets/bottles/mens-50-multi.png',
      inStock: true,
      category: 'immunity',
    },
    {
      _id: 'shelf-sleep-05',
      name: 'Sleep',
      slug: 'sleep',
      price: 430.00,
      image: 'assets/bottles/sleep.png',
      inStock: true,
      category: 'sleep',
    },
  ];

  shelfProducts: HappyShelfItem[] = [];

  // ── Lifecycle ────────────────────────────────────────────────
  ngOnInit(): void {
    this.fetchProducts();
  }

  ngOnDestroy(): void {
    this.stopAutoplay();
  }

  // ── Data Loading ─────────────────────────────────────────────
  fetchProducts(): void {
    this.isLoading = true;
    this.cdr.detectChanges();

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
          this.cdr.detectChanges();
          setTimeout(() => {
            this.updateScrollState();
            this.startAutoplay(); // Begin autoplay once data is ready
          }, 80);
        },
        error: () => {
          this.shelfProducts = [...this.defaultShelfProducts];
          this.isLoading = false;
          this.cdr.detectChanges();
          setTimeout(() => this.startAutoplay(), 80);
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
        } else {
          const isAvailable =
            (bp as any).inStock !== false &&
            (bp.variants?.[0]?.stock === undefined ||
              bp.variants[0].stock > 0 ||
              bp.variants[0].stock === -1);

          items.push({
            _id: bp._id,
            name: bp.name,
            slug: bp.slug,
            price: bp.variants?.[0]?.price || 410.00,
            originalPrice: bp.variants?.[0]?.originalPrice ?? null,
            image: bp.image || bp.images?.[0] || 'assets/bottles/sleep.png',
            inStock: isAvailable,
            category: typeof bp.category === 'object' ? bp.category?.name : bp.category,
            rawProduct: bp,
          });
        }
      });
    }

    this.shelfProducts = items;
  }

  // ── Autoplay Engine ─────────────────────────────────────────
  /** Start the continuous auto-scroll ticker. */
  private startAutoplay(): void {
    if (this.autoplayTimer !== null) return; // already running
    this.autoplayTimer = setInterval(() => this.autoplayTick(), AUTOPLAY_DELAY_MS);
  }

  /** Stop the auto-scroll ticker. */
  private stopAutoplay(): void {
    if (this.autoplayTimer !== null) {
      clearInterval(this.autoplayTimer);
      this.autoplayTimer = null;
    }
  }

  /** Called every AUTOPLAY_DELAY_MS when not paused. */
  private autoplayTick(): void {
    if (!this.shelfTrack) return;
    const el = this.shelfTrack.nativeElement;
    const maxScroll = el.scrollWidth - el.clientWidth;
    const current   = el.scrollLeft;

    if (maxScroll <= 0) return;

    if (current >= maxScroll - 4) {
      // Reached end → loop back to start
      el.scrollTo({ left: 0, behavior: 'smooth' });
    } else {
      el.scrollBy({ left: AUTOPLAY_STEP_PX, behavior: 'smooth' });
    }
  }

  // ── Section-level Hover (Pause on Enter / Resume on Leave) ──
  onSectionMouseEnter(): void {
    this.isHovered = true;
    this.stopAutoplay();
  }

  onSectionMouseLeave(): void {
    this.isHovered = false;
    if (!this.isCardHovered) {
      this.startAutoplay();
    }
  }

  // ── Card-level Hover (Extra granular pause per card) ─────────
  onCardMouseEnter(): void {
    this.isCardHovered = true;
    this.stopAutoplay();
  }

  onCardMouseLeave(): void {
    this.isCardHovered = false;
    if (!this.isHovered) {
      this.startAutoplay();
    }
  }

  // ── Carousel Manual Scroll Controls ─────────────────────────
  scrollPrev(): void {
    if (!this.shelfTrack) return;
    this.stopAutoplay();
    const el = this.shelfTrack.nativeElement;
    el.scrollBy({ left: -(el.clientWidth * 0.75), behavior: 'smooth' });
    // Resume after a brief pause when user navigates manually
    setTimeout(() => { if (!this.isHovered && !this.isCardHovered) this.startAutoplay(); }, 2500);
  }

  scrollNext(): void {
    if (!this.shelfTrack) return;
    this.stopAutoplay();
    const el = this.shelfTrack.nativeElement;
    el.scrollBy({ left: el.clientWidth * 0.75, behavior: 'smooth' });
    setTimeout(() => { if (!this.isHovered && !this.isCardHovered) this.startAutoplay(); }, 2500);
  }

  onScroll(): void {
    this.updateScrollState();
  }

  private updateScrollState(): void {
    if (!this.shelfTrack) return;
    const el = this.shelfTrack.nativeElement;
    const maxScroll = el.scrollWidth - el.clientWidth;

    if (maxScroll <= 0) {
      this.scrollProgress = 0;
      this.canScrollPrev  = false;
      this.canScrollNext  = false;
    } else {
      const current        = Math.max(0, el.scrollLeft);
      this.scrollProgress  = Math.min(100, Math.round((current / maxScroll) * 100));
      this.canScrollPrev   = current > 10;
      this.canScrollNext   = current < maxScroll - 10;
    }
    this.cdr.detectChanges();
  }

  // ── Notify Me (Out-of-Stock) ─────────────────────────────────
  onNotifyMe(item: HappyShelfItem, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    const msg =
      this.translate.currentLang === 'ar'
        ? `سنقوم بإشعارك فور توفر "${item.name}"!`
        : `We'll notify you as soon as "${item.name}" is back in stock!`;
    this.toastService.success(msg);
  }

  // ── Add to Cart (In-Stock) ───────────────────────────────────
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
