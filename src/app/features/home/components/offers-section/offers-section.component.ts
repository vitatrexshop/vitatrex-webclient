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
  OnDestroy,
  PLATFORM_ID,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Swiper from 'swiper';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import { PromotionService } from '../../../../core/services/promotion.service';
import { CartService } from '../../../../core/services/cart.service';
import { CartDrawerService } from '../../../../core/services/cart-drawer.service';
import { UnifiedPromotion, PromotionOffer, PromotionBundle } from '../../../../core/models/promotion.model';
import { OfferItem } from '../../../../core/models/offer.model';
import { Product } from '../../../../core/models/product.model';
import { environment } from '../../../../../environments/environment';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

const SLOT_LABELS = ['اختر منتجك الأول', 'اختر منتجك الثاني', 'اختر منتجك الثالث'];

@Component({
  selector: 'app-offers-section',
  templateUrl: './offers-section.component.html',
  styleUrls: ['./offers-section.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class OffersSectionComponent implements AfterViewInit, OnDestroy {
  @ViewChild('offersSection', { static: false }) sectionEl?: ElementRef<HTMLElement>;
  @ViewChild('swiperEl', { static: false }) swiperEl?: ElementRef<HTMLElement>;

  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly promotionService = inject(PromotionService);
  private readonly cartService = inject(CartService);
  private readonly cartDrawer = inject(CartDrawerService);
  private readonly ngZone = inject(NgZone);

  private ctx?: gsap.Context;
  private swiper?: Swiper;
  private readonly isBrowser: boolean;

  isLoading = true;
  promotions: UnifiedPromotion[] = [];

  readonly slotLabels = SLOT_LABELS;

  // Per-bundle 3-slot state maps
  selectedSlots = new Map<string, (Product | null)[]>();
  activeSlotIdx = new Map<string, number>();
  showModal = new Map<string, boolean>();
  checkAnim = new Map<string, boolean[]>();
  addingIds = new Set<string>();
  activeModalBundle: PromotionBundle | null = null;

  // Mock Products for fallback interactive bundle
  private readonly mockProductImmune: Product = {
    _id: 'prod-immune-01',
    name: 'فيتاتريكس درع المناعة (C + زنك)',
    slug: 'vitatrix-immune-shield',
    category: 'immunity',
    description: 'حلوى فيتامين C الطبيعية مع الزنك ومضادات الأكسدة',
    benefits: ['تعزيز المناعة', 'مضاد أكسدة طبيعي', 'طاقة يومية'],
    isBestSeller: true,
    isFeatured: true,
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=300&q=80',
    isActive: true,
    variants: [{ _id: 'v1', count: 60, price: 290, originalPrice: 350, discountPercentage: 17, stock: 50 }],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  private readonly mockProductIron: Product = {
    _id: 'prod-iron-02',
    name: 'فيتاتريكس طاقة الحديد والنشاط',
    slug: 'vitatrix-iron-energy',
    category: 'energy',
    description: 'مركب الحديد اللطيف مع فيتامينات B لمحاربة الإرهاق',
    benefits: ['زيادة الهيموجلوبين', 'محاربة الإرهاق', 'نشاط مستمر'],
    isBestSeller: true,
    isFeatured: true,
    image: 'https://images.unsplash.com/photo-1550989460-0adf9ea622e2?auto=format&fit=crop&w=300&q=80',
    isActive: true,
    variants: [{ _id: 'v2', count: 60, price: 310, originalPrice: 380, discountPercentage: 18, stock: 40 }],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  private readonly mockProductSleep: Product = {
    _id: 'prod-sleep-03',
    name: 'فيتاتريكس النوم الهادئ (ميلاتونين)',
    slug: 'vitatrix-sleep-well',
    category: 'sleep',
    description: 'مزيج الميلاتونين والبابونج لنوم عميق ومريح',
    benefits: ['نوم عميق وهادئ', 'استرخاء طبيعي', 'استيقاظ بنشاط'],
    isBestSeller: true,
    isFeatured: true,
    image: 'https://images.unsplash.com/photo-1576602976047-174e57a47881?auto=format&fit=crop&w=300&q=80',
    isActive: true,
    variants: [{ _id: 'v3', count: 60, price: 280, originalPrice: 340, discountPercentage: 17, stock: 60 }],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  private readonly mockProductBeauty: Product = {
    _id: 'prod-beauty-04',
    name: 'فيتاتريكس إشراقة الجمال (بيوتين)',
    slug: 'vitatrix-beauty-glow',
    category: 'hair',
    description: 'بيوتين عالي التركيز مع الكولاجين لنضارة البشرة والشعر',
    benefits: ['نضارة البشرة', 'تقوية الشعر', 'صحة الأظافر'],
    isBestSeller: false,
    isFeatured: true,
    image: 'https://images.unsplash.com/photo-1512290900672-1f02e6005b76?auto=format&fit=crop&w=300&q=80',
    isActive: true,
    variants: [{ _id: 'v4', count: 60, price: 320, originalPrice: 390, discountPercentage: 18, stock: 35 }],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  private readonly mockProductKids: Product = {
    _id: 'prod-kids-05',
    name: 'فيتاتريكس مالتي فيتامين للأبطال',
    slug: 'vitatrix-kids-multi',
    category: 'kids',
    description: '14 فيتامين ومعدن أساسي للنمو الصحي والتركيز',
    benefits: ['دعم النمو', 'زيادة التركيز', 'تقوية المناعة'],
    isBestSeller: false,
    isFeatured: true,
    image: 'https://images.unsplash.com/photo-1577401239170-897942555fb3?auto=format&fit=crop&w=300&q=80',
    isActive: true,
    variants: [{ _id: 'v5', count: 60, price: 270, originalPrice: 330, discountPercentage: 18, stock: 45 }],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  readonly fallbackPromotions: UnifiedPromotion[] = [
    {
      id: 'bundle-interactive-1',
      _id: 'bundle-interactive-1',
      type: 'bundle',
      title: 'باقة اصنع باقتك الخاصة',
      slug: 'custom-bundle-3-products',
      description: 'ثلاثة منتجات من اختيارك الحر — بسعر واحد مميز',
      image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=1200&q=85',
      badgeText: 'الأكثر طلباً • باقة 3 منتجات',
      allowedProducts: [this.mockProductImmune, this.mockProductIron, this.mockProductSleep, this.mockProductBeauty, this.mockProductKids],
      originalPrice: 890,
      discountedPrice: 590,
      bundlePrice: 590,
      discountPercentage: 34,
      isActive: true,
    },
    {
      id: 'offer-demo-immune',
      _id: 'offer-demo-immune',
      type: 'offer',
      title: 'عرض درع المناعة والنشاط الفائق',
      slug: 'immunity-shield-offer',
      description: 'تركيبة الزنك وفيتامين C مع خلاصة الفواكه الطبيعية لتعزيز مقاومة الجسم ودعم المناعة',
      image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=1200&q=85',
      badgeText: 'وفر 25%',
      items: [{ product: this.mockProductImmune, quantity: 2 }],
      originalPrice: 780,
      discountedPrice: 585,
      offerPrice: 585,
      discountPercentage: 25,
      isActive: true,
    },
    {
      id: 'bundle-interactive-2',
      _id: 'bundle-interactive-2',
      type: 'bundle',
      title: 'باقة العائلة والنمو الذكي المتكامل',
      slug: 'family-growth-bundle-choice',
      description: 'ثلاثة منتجات من اختيارك الحر لدعم جميع أفراد العائلة',
      image: 'https://images.unsplash.com/photo-1550989460-0adf9ea622e2?auto=format&fit=crop&w=1200&q=85',
      badgeText: 'توفير عائلي',
      allowedProducts: [this.mockProductKids, this.mockProductIron, this.mockProductImmune, this.mockProductSleep, this.mockProductBeauty],
      originalPrice: 990,
      discountedPrice: 680,
      bundlePrice: 680,
      discountPercentage: 31,
      isActive: true,
    },
    {
      id: 'offer-demo-sleep',
      _id: 'offer-demo-sleep',
      type: 'offer',
      title: 'عرض النوم الهادئ والاسترخاء الطبيعي',
      slug: 'sleep-well-relaxation-offer',
      description: 'مزيج الميلاتونين النقي والبابونج واللافندر لنوم عميق وهادئ واستيقاظ بكامل الحيوية',
      image: 'https://images.unsplash.com/photo-1576602976047-174e57a47881?auto=format&fit=crop&w=1200&q=85',
      badgeText: 'وفر 30%',
      items: [{ product: this.mockProductSleep, quantity: 2 }],
      originalPrice: 680,
      discountedPrice: 475,
      offerPrice: 475,
      discountPercentage: 30,
      isActive: true,
    },
  ];

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngAfterViewInit(): void {
    this.fetchPromotions();
  }

  ngOnDestroy(): void {
    this.ctx?.revert();
    this.swiper?.destroy(true, true);
    if (this.isBrowser) {
      ScrollTrigger.getAll().forEach((t) => t.kill());
      document.body.style.overflow = '';
    }
  }

  // ─── Data ─────────────────────────────────────────────────────────────────

  private fetchPromotions(): void {
    this.isLoading = true;
    this.cdr.detectChanges();

    this.promotionService
      .getCombinedPromotions()
      .pipe(
        catchError(() => of([])),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((data) => {
        if (data && Array.isArray(data) && data.length > 0) {
          const hasBundles = data.some((item) => item.type === 'bundle');
          if (hasBundles) {
            this.promotions = data;
          } else {
            const mockBundles = this.fallbackPromotions.filter((p) => p.type === 'bundle');
            this.promotions = [...mockBundles, ...data];
          }
        } else {
          this.promotions = this.fallbackPromotions;
        }

        // Initialize slot maps for all bundle promotions
        this.promotions.forEach((p) => {
          if (p.type === 'bundle') {
            const bId = p.id || p._id || '';
            if (!this.selectedSlots.has(bId)) {
              this.selectedSlots.set(bId, [null, null, null]);
              this.checkAnim.set(bId, [false, false, false]);
            }
          }
        });

        this.isLoading = false;
        this.cdr.detectChanges();

        if (this.isBrowser && this.promotions.length > 0) {
          this.ngZone.runOutsideAngular(() => {
            requestAnimationFrame(() => {
              this.initSwiper();
              this.initScrollTrigger();
              ScrollTrigger.refresh();
            });
          });
        } else if (this.isBrowser) {
          this.ngZone.runOutsideAngular(() => {
            requestAnimationFrame(() => {
              this.initScrollTrigger();
              ScrollTrigger.refresh();
            });
          });
        }
      });
  }

  // ─── Swiper Slider ────────────────────────────────────────────────────────

  private initSwiper(): void {
    const el = this.swiperEl?.nativeElement;
    if (!el) return;
    const section = this.sectionEl?.nativeElement;

    this.swiper?.destroy(true, true);

    this.swiper = new Swiper(el, {
      modules: [Navigation, Pagination, Autoplay],
      loop: this.promotions.length > 1,
      slidesPerView: 1,
      spaceBetween: 24,
      centeredSlides: true,
      speed: 600,
      grabCursor: true,
      observer: true,
      observeParents: true,
      observeSlideChildren: true,
      resizeObserver: true,
      updateOnWindowResize: true,
      autoplay: {
        delay: 5500,
        disableOnInteraction: false,
        pauseOnMouseEnter: true,
      },
      pagination: {
        el: el.querySelector<HTMLElement>('.offers-pagination') ?? undefined,
        clickable: true,
        dynamicBullets: true,
      },
      navigation: {
        nextEl: section?.querySelector<HTMLElement>('.offers-nav--next') ?? undefined,
        prevEl: section?.querySelector<HTMLElement>('.offers-nav--prev') ?? undefined,
      },
    });

    this.swiper.update();
    setTimeout(() => {
      this.swiper?.update();
    }, 100);
  }

  // ─── GSAP ─────────────────────────────────────────────────────────────────

  private initScrollTrigger(): void {
    const section = this.sectionEl?.nativeElement;
    if (!section || !this.isBrowser) return;

    this.ctx?.revert();

    // Ensure baseline visibility immediately
    const header = section.querySelector<HTMLElement>('.offers-header');
    if (header) header.style.opacity = '1';
    const swiperTarget = section.querySelector<HTMLElement>('.offers-swiper');
    if (swiperTarget) swiperTarget.style.opacity = '1';

    this.ctx = gsap.context(() => {
      if (header) {
        gsap.fromTo(
          header,
          { opacity: 0.85, y: 15 },
          {
            opacity: 1,
            y: 0,
            duration: 0.5,
            ease: 'power2.out',
            clearProps: 'all',
          }
        );
      }

      if (swiperTarget) {
        gsap.fromTo(
          swiperTarget,
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
    }, section);
  }

  // ─── Modal & Slot Selection ───────────────────────────────────────────────

  openModalForSlot(bundle: PromotionBundle, slotIdx: number, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const bId = bundle.id || bundle._id || '';
    this.activeModalBundle = bundle;
    this.activeSlotIdx.set(bId, slotIdx);
    this.showModal.set(bId, true);
    if (this.isBrowser) document.body.style.overflow = 'hidden';
    this.cdr.markForCheck();
  }

  closeModal(): void {
    if (this.activeModalBundle) {
      const bId = this.activeModalBundle.id || this.activeModalBundle._id || '';
      this.showModal.set(bId, false);
    }
    this.activeModalBundle = null;
    if (this.isBrowser) document.body.style.overflow = '';
    this.cdr.markForCheck();
  }

  isModalOpen(bundleId: string): boolean {
    return this.showModal.get(bundleId) ?? false;
  }

  getActiveSlotIdx(bundleId: string): number {
    return this.activeSlotIdx.get(bundleId) ?? 0;
  }

  getActiveSlotLabel(bundleId: string): string {
    return this.slotLabels[this.getActiveSlotIdx(bundleId)] ?? 'اختر منتجك';
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('bc-modal-backdrop')) {
      this.closeModal();
    }
  }

  selectProductForSlot(bundle: PromotionBundle, product: Product, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const bId = bundle.id || bundle._id || '';
    const slotIdx = this.activeSlotIdx.get(bId) ?? 0;
    const slots = this.selectedSlots.get(bId) ?? [null, null, null];
    slots[slotIdx] = product;
    this.selectedSlots.set(bId, [...slots]);
    this.closeModal();

    // Trigger per-slot checkmark animation
    const anims = this.checkAnim.get(bId) ?? [false, false, false];
    anims[slotIdx] = true;
    this.checkAnim.set(bId, [...anims]);
    setTimeout(() => {
      const a = this.checkAnim.get(bId) ?? [false, false, false];
      a[slotIdx] = false;
      this.checkAnim.set(bId, [...a]);
      this.cdr.markForCheck();
    }, 1400);

    this.cdr.markForCheck();
  }

  getSlotProduct(bundleId: string, slotIdx: number): Product | null {
    return (this.selectedSlots.get(bundleId) ?? [null, null, null])[slotIdx] ?? null;
  }

  isSlotCheckAnimating(bundleId: string, slotIdx: number): boolean {
    return (this.checkAnim.get(bundleId) ?? [false, false, false])[slotIdx] ?? false;
  }

  allSlotsSelected(bundleId: string): boolean {
    const slots = this.selectedSlots.get(bundleId) ?? [];
    return slots.length === 3 && slots.every((s) => s !== null);
  }

  getSelectedProducts(bundleId: string): Product[] {
    return (this.selectedSlots.get(bundleId) ?? []).filter((p): p is Product => p !== null);
  }

  getSelectableProducts(bundle: PromotionBundle): Product[] {
    return (bundle.allowedProducts ?? []).filter(
      (p): p is Product => typeof p === 'object' && (p as Product).isActive !== false
    );
  }

  // ─── Cart Actions ─────────────────────────────────────────────────────────

  handleAddToCart(promo: UnifiedPromotion, event?: Event): void {
    if (promo.type === 'bundle') {
      this.addBundleToCart(promo as PromotionBundle, event);
    } else {
      this.addOfferToCart(promo as PromotionOffer, event);
    }
  }

  /**
   * Add Interactive 3-Slot Bundle to Cart
   */
  addBundleToCart(bundle: PromotionBundle, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const bId = bundle.id || bundle._id || '';

    // If not all 3 chosen, open modal for first empty slot
    if (!this.allSlotsSelected(bId)) {
      const slots = this.selectedSlots.get(bId) ?? [null, null, null];
      const emptyIdx = slots.findIndex((s) => s === null);
      this.openModalForSlot(bundle, emptyIdx >= 0 ? emptyIdx : 0, event);
      return;
    }

    if (this.addingIds.has(bId)) return;
    this.addingIds.add(bId);
    this.cdr.markForCheck();

    const chosen = this.getSelectedProducts(bId);
    this.cartService.addBundleToCart(bundle, chosen, 1);
    this.cartDrawer.open();

    setTimeout(() => {
      this.addingIds.delete(bId);
      this.cdr.markForCheck();
    }, 1200);
  }

  /**
   * Add Standard Promotional Offer to Cart
   */
  addOfferToCart(offer: PromotionOffer, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const oId = offer.id || offer._id || '';
    if (this.addingIds.has(oId)) return;

    const itemsToAdd = (offer.items ?? []).filter(
      (i): i is OfferItem & { product: Product } =>
        typeof i.product === 'object' && i.product !== null
    );

    if (itemsToAdd.length === 0) {
      this.cartDrawer.open();
      return;
    }

    this.addingIds.add(oId);
    this.cdr.markForCheck();

    const pricePerItem = Math.round((offer.discountedPrice ?? offer.offerPrice ?? 0) / itemsToAdd.length);

    itemsToAdd.forEach((item) => {
      const product = item.product as Product;
      const variantsArr = Array.isArray(product.variants) ? product.variants : [];
      const variant = variantsArr[0] ?? {
        _id: `${product._id}-synthetic`,
        count: 1,
        price: pricePerItem,
        originalPrice: Math.round((offer.originalPrice ?? 0) / itemsToAdd.length),
        discountPercentage: offer.discountPercentage ?? 0,
        stock: 99,
      };

      this.cartService.addToCart(product, variant as any, item.quantity ?? 1);
    });

    this.cartDrawer.open();

    setTimeout(() => {
      this.addingIds.delete(oId);
      this.cdr.markForCheck();
    }, 1200);
  }

  // ─── Theme & Template Helpers ─────────────────────────────────────────────

  getOfferTheme(promo: UnifiedPromotion): 'immune' | 'iron' | 'sleep' {
    const text = `${promo.slug || ''} ${promo.title || ''} ${promo.badgeText || ''} ${promo.description || ''}`.toLowerCase();
    if (
      text.includes('immune') ||
      text.includes('مناعة') ||
      text.includes('وقاية') ||
      text.includes('green') ||
      text.includes('درع')
    ) {
      return 'immune';
    }
    if (
      text.includes('iron') ||
      text.includes('حديد') ||
      text.includes('دم') ||
      text.includes('energy') ||
      text.includes('طاقة') ||
      text.includes('نشاط') ||
      text.includes('red')
    ) {
      return 'iron';
    }
    if (
      text.includes('sleep') ||
      text.includes('نوم') ||
      text.includes('relax') ||
      text.includes('استرخاء') ||
      text.includes('هدوء') ||
      text.includes('purple')
    ) {
      return 'sleep';
    }
    return 'sleep';
  }

  /**
   * Injects Cloudinary auto-format/quality/width transformation flags into any
   * Cloudinary URL so the CDN delivers the optimal asset for a 1160-px viewport.
   * Non-Cloudinary URLs are returned untouched.
   */
  private optimizeCloudinaryUrl(url: string, width = 1160): string {
    if (!url || !url.includes('res.cloudinary.com')) return url;
    const flags = `f_auto,q_auto,w_${width}`;
    if (url.includes('f_auto')) return url;
    return url.replace('/image/upload/', `/image/upload/${flags}/`);
  }

  formatMediaUrl(url?: string): string {
    if (!url) return '';
    const raw = url.trim();
    if (
      raw.startsWith('http://') ||
      raw.startsWith('https://') ||
      raw.startsWith('blob:') ||
      raw.startsWith('assets/')
    ) {
      return this.optimizeCloudinaryUrl(raw, 1160);
    }
    if (raw.startsWith('/uploads')) return `${environment.mediaBaseUrl}${raw}`;
    if (raw.startsWith('uploads')) return `${environment.mediaBaseUrl}/${raw}`;
    return raw;
  }

  trackById(_: number, item: UnifiedPromotion): string {
    return item.id || item._id || '';
  }

  trackByProductId(_: number, p: Product): string {
    return p._id;
  }

  isAdding(promoId: string): boolean {
    return this.addingIds.has(promoId);
  }

  asBundle(promo: UnifiedPromotion): PromotionBundle {
    return promo as PromotionBundle;
  }

  asOffer(promo: UnifiedPromotion): PromotionOffer {
    return promo as PromotionOffer;
  }
}
