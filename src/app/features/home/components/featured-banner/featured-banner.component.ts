import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  OnInit,
} from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ProductService } from '../../../../core/services/product.service';
import { OfferService } from '../../../../core/services/offer.service';
import { Product } from '../../../../core/models/product.model';
import { Category } from '../../../../core/models/category.model';
import { Offer } from '../../../../core/models/offer.model';

/** Unified view-model for whatever is being featured (product or bundle) */
export interface FeaturedItem {
  type: 'product' | 'offer';
  title: string;
  tagline: string;
  description: string;
  image: string;
  price: number;
  originalPrice?: number;
  discountPct?: number;
  link: any[];
  floatBadge: string;
  bgColor: string;
  benefits: string[];
}

/**
 * Featured Product/Bundle Showcase Banner.
 * Olly.com-inspired 50/50 split-canvas layout.
 * Priority order: active offer → featured product → bestseller → first product.
 */
@Component({
  selector: 'app-featured-banner',
  templateUrl: './featured-banner.component.html',
  styleUrls: ['./featured-banner.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeaturedBannerComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  featured: FeaturedItem | null = null;
  isLoading = true;

  constructor(
    private readonly productService: ProductService,
    private readonly offerService: OfferService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    forkJoin({
      products: this.productService.getProducts().pipe(catchError(() => of([]))),
      offers: this.offerService.getOffers().pipe(catchError(() => of([]))),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ products, offers }) => {
        this.featured = this.resolve(products, offers);
        this.isLoading = false;
        this.cdr.markForCheck();
      });
  }

  private resolve(products: Product[], offers: Offer[]): FeaturedItem | null {
    // 1. Highest-revenue priority: active offer with a discount
    const activeOffer = offers.find(o => o.isActive !== false && o.discountPercentage > 0);
    if (activeOffer) return this.fromOffer(activeOffer, products);

    // 2. Explicitly featured product
    const featured =
      products.find(p => Boolean(p.isFeatured) && p.isActive !== false) ??
      products.find(p => Boolean(p.isBestSeller) && p.isActive !== false) ??
      products.find(p => p.isActive !== false);

    return featured ? this.fromProduct(featured) : null;
  }

  private fromProduct(p: Product): FeaturedItem {
    const variant = p.variants?.[0];
    const category = p.category ?? 'vitamins';
    return {
      type: 'product',
      title: p.name,
      tagline: p.isBestSeller
        ? '🏆 الأكثر مبيعاً لدينا'
        : p.isFeatured
        ? '⭐ منتج الشهر المميز'
        : '🌿 منتج صحي طبيعي',
      description:
        p.benefits?.slice(0, 2).join(' • ') ||
        p.description ||
        'مكونات طبيعية 100% بدون مواد حافظة.',
      image: p.image,
      price: variant?.price ?? 0,
      originalPrice: variant?.originalPrice ?? undefined,
      discountPct: (variant?.discountPercentage ?? 0) > 0 ? variant!.discountPercentage : undefined,
      link: ['/shop', p.slug],
      floatBadge: p.isBestSeller ? 'الأكثر طلباً 🔥' : '⚡ جديد',
      bgColor: this.bgForCategory(category),
      benefits: p.benefits?.slice(0, 3) ?? [],
    };
  }

  private fromOffer(o: Offer, products: Product[]): FeaturedItem {
    // Resolve product names inside the bundle from the concurrent product list
    const items = o.items
      .map(item => {
        const id =
          typeof item.product === 'object' ? item.product._id : item.product;
        const prod = products.find(p => p._id === id);
        return prod ? `${item.quantity} × ${prod.name}` : '';
      })
      .filter(Boolean);

    return {
      type: 'offer',
      title: o.title,
      tagline: o.badgeText || '🎁 باقة التوفير المميزة',
      description: o.description || items.join(' • '),
      image: o.image,
      price: o.offerPrice,
      originalPrice: o.originalPrice,
      discountPct: o.discountPercentage,
      link: ['/shop'],
      floatBadge: `وفر ${o.discountPercentage}% 🎉`,
      bgColor: '#7c3aed',  // Rich purple for bundle offers
      benefits: items.length ? items : [`خصم ${o.discountPercentage}%`, 'شحن مجاني متوفر'],
    };
  }

  /** Map product category slug → brand background color */
  private bgForCategory(cat: Category | string): string {
    const slug = typeof cat === 'object' && cat ? (cat.slug || cat.name || '').toLowerCase() : (cat || '').toLowerCase();
    const map: Record<string, string> = {
      immunity: '#e11d48',  // Bold Coral/Rose
      kids:     '#7c3aed',  // Royal Purple
      sleep:    '#4f46e5',  // Deep Indigo
      vitamins: '#064e3b',  // Deep Forest Emerald (brand primary)
    };
    for (const key of Object.keys(map)) {
      if (slug.includes(key)) return map[key];
    }
    return '#064e3b';
  }
}
