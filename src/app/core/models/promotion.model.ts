import { ApiResponse } from './api-response.model';
import { Product } from './product.model';
import { OfferItem } from './offer.model';

export type PromotionType = 'offer' | 'bundle';

export interface PromotionBase {
  id: string;
  _id?: string;
  type: PromotionType;
  title: string;
  slug: string;
  description?: string;
  badgeText?: string | null;
  image?: string;
  originalPrice: number;
  discountedPrice: number;
  offerPrice?: number;
  bundlePrice?: number;
  discountPercentage: number;
  isActive: boolean;
  startDate?: string | null;
  endDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PromotionOffer extends PromotionBase {
  type: 'offer';
  items?: OfferItem[];
}

export interface PromotionBundle extends PromotionBase {
  type: 'bundle';
  allowedProducts: (string | Product)[];
}

export type UnifiedPromotion = PromotionOffer | PromotionBundle;

export type PromotionCombinedResponse = ApiResponse<UnifiedPromotion[]>;
