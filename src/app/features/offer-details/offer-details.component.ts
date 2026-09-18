import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  DestroyRef,
  inject,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, of, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Offer, OfferItem } from '../../core/models/offer.model';
import { Product } from '../../core/models/product.model';
import { OfferService } from '../../core/services/offer.service';
import { CartService } from '../../core/services/cart.service';
import { CartDrawerService } from '../../core/services/cart-drawer.service';
import { environment } from '../../../environments/environment';

/** Simple MongoDB ObjectId validator — 24 hex chars */
const isObjectId = (s: string): boolean => /^[a-f\d]{24}$/i.test(s);

const DEMO_OFFERS: Record<string, Offer> = {
  'immunity-shield-offer': {
    _id: 'offer-demo-immune',
    title: 'Vitatrex Immune Gummies Bundle',
    slug: 'immunity-shield-offer',
    description: 'تركيبة الزنك وفيتامين C مع خلاصة الفواكه الطبيعية لتعزيز مقاومة الجسم ودعم المناعة',
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=1200&q=85',
    badgeText: 'وفر أكثر',
    items: [
      {
        product: {
          _id: 'prod-immune-01',
          name: 'فيتاتريكس درع المناعة (C + زنك)',
          slug: 'vitatrix-immune-shield',
          description: 'حلوى فيتامين C الطبيعية مع الزنك ومضادات الأكسدة',
          benefits: ['تعزيز المناعة', 'مضاد أكسدة طبيعي', 'طاقة يومية'],
          isBestSeller: true,
          isFeatured: true,
          image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=300&q=80',
          category: 'immunity',
          isActive: true,
          variants: [{ _id: 'v1', count: 60, price: 290, originalPrice: 350, discountPercentage: 17, stock: 50 }],
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
        } as unknown as Product,
        quantity: 2,
      },
    ],
    originalPrice: 900,
    offerPrice: 600,
    discountPercentage: 33,
    isActive: true,
    startDate: null,
    endDate: null,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  'sleep-well-relaxation-offer': {
    _id: 'offer-demo-sleep',
    title: 'عرض النوم الهادئ والاسترخاء الطبيعي',
    slug: 'sleep-well-relaxation-offer',
    description: 'مزيج الميلاتونين النقي والبابونج واللافندر لنوم عميق وهادئ واستيقاظ بكامل الحيوية',
    image: 'https://images.unsplash.com/photo-1576602976047-174e57a47881?auto=format&fit=crop&w=1200&q=85',
    badgeText: 'وفر 30%',
    items: [
      {
        product: {
          _id: 'prod-sleep-03',
          name: 'فيتاتريكس النوم الهادئ (ميلاتونين)',
          slug: 'vitatrix-sleep-well',
          description: 'مزيج الميلاتونين والبابونج لنوم عميق ومريح',
          benefits: ['نوم عميق وهادئ', 'استرخاء طبيعي', 'استيقاظ بنشاط'],
          isBestSeller: true,
          isFeatured: true,
          image: 'https://images.unsplash.com/photo-1576602976047-174e57a47881?auto=format&fit=crop&w=300&q=80',
          category: 'sleep',
          isActive: true,
          variants: [{ _id: 'v3', count: 60, price: 280, originalPrice: 340, discountPercentage: 17, stock: 60 }],
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
        } as unknown as Product,
        quantity: 2,
      },
    ],
    originalPrice: 680,
    offerPrice: 475,
    discountPercentage: 30,
    isActive: true,
    startDate: null,
    endDate: null,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
};
DEMO_OFFERS['offer-demo-immune'] = DEMO_OFFERS['immunity-shield-offer'];
DEMO_OFFERS['offer-demo-sleep'] = DEMO_OFFERS['sleep-well-relaxation-offer'];

@Component({
  selector: 'app-offer-details',
  templateUrl: './offer-details.component.html',
  styleUrls: ['./offer-details.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OfferDetailsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly offerService = inject(OfferService);
  private readonly cartService = inject(CartService);
  private readonly cartDrawer = inject(CartDrawerService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  offer: Offer | null = null;
  isLoading = true;
  isAdding = false;
  error: string | null = null;

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          const param = params.get('id') ?? '';
          if (!param) {
            this.router.navigate(['/']);
            return of(null);
          }
          this.isLoading = true;
          this.error = null;
          this.cdr.markForCheck();

          // The public backend route is GET /offers/:slug (slug-only lookup).
          // If the param looks like a MongoDB ObjectId, try getOfferById first,
          // otherwise go straight to getOfferBySlug.
          const fetch$ = isObjectId(param)
            ? this.offerService.getOfferById(param).pipe(
                catchError(() => this.offerService.getOfferBySlug(param))
              )
            : this.offerService.getOfferBySlug(param).pipe(
                catchError(() => this.offerService.getOfferById(param))
              );

          return fetch$.pipe(
            catchError(() => {
              if (DEMO_OFFERS[param]) {
                return of(DEMO_OFFERS[param]);
              }
              this.error = 'تعذّر تحميل تفاصيل العرض. يرجى المحاولة مرة أخرى.';
              return of(null);
            })
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((offer) => {
        this.offer = offer;
        this.isLoading = false;
        this.cdr.markForCheck();
      });
  }

  addToCart(): void {
    if (!this.offer || this.isAdding) return;
    this.isAdding = true;
    this.cdr.markForCheck();

    this.cartService.addOfferToCart(this.offer, 1);
    this.cartDrawer.open();

    setTimeout(() => {
      this.isAdding = false;
      this.cdr.markForCheck();
    }, 1200);
  }

  goBack(): void {
    window.history.length > 1 ? window.history.back() : this.router.navigate(['/']);
  }

  /** Resolve item product name from populated or ID-only OfferItem */
  getProductName(item: OfferItem): string {
    return typeof item.product === 'object' ? (item.product as Product).name : '';
  }

  /** Resolve item product image */
  getProductImage(item: OfferItem): string {
    if (typeof item.product === 'object') {
      const img = (item.product as Product).image ?? '';
      return this.formatMediaUrl(img);
    }
    return '';
  }

  /** Discount percentage — use backend field or derive */
  get savingsPercent(): number {
    if (!this.offer) return 0;
    if (this.offer.discountPercentage) return this.offer.discountPercentage;
    if (this.offer.originalPrice > this.offer.offerPrice) {
      return Math.round(
        ((this.offer.originalPrice - this.offer.offerPrice) / this.offer.originalPrice) * 100
      );
    }
    return 0;
  }

  get savings(): number {
    if (!this.offer) return 0;
    return this.offer.originalPrice - this.offer.offerPrice;
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
      return raw;
    }
    if (raw.startsWith('/uploads')) return `${environment.mediaBaseUrl}${raw}`;
    if (raw.startsWith('uploads')) return `${environment.mediaBaseUrl}/${raw}`;
    return raw;
  }
}
