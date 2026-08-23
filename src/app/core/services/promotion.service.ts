import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ApiService } from './api.service';
import { OfferService } from './offer.service';
import { BundleService } from './bundle.service';
import { UnifiedPromotion, PromotionCombinedResponse } from '../models/promotion.model';
import { Offer } from '../models/offer.model';
import { Bundle } from '../models/bundle.model';

const PROMOTIONS_COMBINED_API = '/api/v1/promotions/combined';

@Injectable({ providedIn: 'root' })
export class PromotionService {
  private readonly api = inject(ApiService);
  private readonly offerService = inject(OfferService);
  private readonly bundleService = inject(BundleService);

  /**
   * Fetch unified promotions (Offers + Bundles).
   * Calls GET /api/v1/promotions/combined.
   * If the backend endpoint is not yet available or returns empty, falls back
   * to fetching /api/v1/offers and /api/v1/bundles in parallel and merging them.
   */
  getCombinedPromotions(): Observable<UnifiedPromotion[]> {
    return this.api.get<UnifiedPromotion[]>(PROMOTIONS_COMBINED_API).pipe(
      map((res) => {
        if (res.data && Array.isArray(res.data) && res.data.length > 0) {
          return res.data.map((item) => this.normalizePromotion(item));
        }
        throw new Error('Empty promotions response, falling back to parallel fetch');
      }),
      catchError(() => this.fallbackFetchAndMerge())
    );
  }

  /**
   * Normalize an item from the backend into a clean UnifiedPromotion
   */
  normalizePromotion(item: any): UnifiedPromotion {
    const isBundle =
      item.type === 'bundle' ||
      (Array.isArray(item.allowedProducts) && item.allowedProducts.length > 0);
    const id = item.id || item._id || '';
    const discountedPrice =
      item.discountedPrice ?? item.offerPrice ?? item.bundlePrice ?? item.originalPrice ?? 0;
    const originalPrice = item.originalPrice ?? discountedPrice;
    const discountPercentage =
      item.discountPercentage ??
      (originalPrice > discountedPrice
        ? Math.round(((originalPrice - discountedPrice) / originalPrice) * 100)
        : 0);

    if (isBundle) {
      return {
        id,
        _id: id,
        type: 'bundle',
        title: item.title || '',
        slug: item.slug || '',
        description: item.description || '',
        badgeText: item.badgeText ?? null,
        image: item.image || '',
        originalPrice,
        discountedPrice,
        bundlePrice: discountedPrice,
        discountPercentage,
        isActive: item.isActive !== false,
        allowedProducts: item.allowedProducts ?? [],
        startDate: item.startDate,
        endDate: item.endDate,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      };
    } else {
      return {
        id,
        _id: id,
        type: 'offer',
        title: item.title || '',
        slug: item.slug || '',
        description: item.description || '',
        badgeText: item.badgeText ?? null,
        image: item.image || '',
        originalPrice,
        discountedPrice,
        offerPrice: discountedPrice,
        discountPercentage,
        isActive: item.isActive !== false,
        items: item.items ?? [],
        startDate: item.startDate,
        endDate: item.endDate,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      };
    }
  }

  /**
   * Client-side fallback merging /api/v1/offers and /api/v1/bundles
   */
  private fallbackFetchAndMerge(): Observable<UnifiedPromotion[]> {
    return forkJoin({
      offers: this.offerService.getOffers().pipe(catchError(() => of([]))),
      bundles: this.bundleService.getBundles().pipe(catchError(() => of([]))),
    }).pipe(
      map(({ offers, bundles }) => {
        const normalizedOffers: UnifiedPromotion[] = (offers || []).map((o: Offer) => ({
          id: o._id,
          _id: o._id,
          type: 'offer' as const,
          title: o.title,
          slug: o.slug,
          description: o.description,
          badgeText: o.badgeText,
          image: o.image,
          originalPrice: o.originalPrice,
          discountedPrice: o.offerPrice,
          offerPrice: o.offerPrice,
          discountPercentage: o.discountPercentage,
          isActive: o.isActive,
          items: o.items,
          startDate: o.startDate,
          endDate: o.endDate,
          createdAt: o.createdAt,
          updatedAt: o.updatedAt,
        }));

        const normalizedBundles: UnifiedPromotion[] = (bundles || []).map((b: Bundle) => ({
          id: b._id,
          _id: b._id,
          type: 'bundle' as const,
          title: b.title,
          slug: b.slug,
          description: b.description,
          badgeText: b.badgeText,
          image: b.image,
          originalPrice: b.originalPrice,
          discountedPrice: b.bundlePrice,
          bundlePrice: b.bundlePrice,
          discountPercentage: b.discountPercentage,
          isActive: b.isActive,
          allowedProducts: b.allowedProducts,
          startDate: b.startDate,
          endDate: b.endDate,
          createdAt: b.createdAt,
          updatedAt: b.updatedAt,
        }));

        return [...normalizedBundles, ...normalizedOffers];
      })
    );
  }
}

