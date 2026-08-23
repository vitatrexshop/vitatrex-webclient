import { ApiResponse } from './api-response.model';
import { Product } from './product.model';

/**
 * A single item inside a bundle offer.
 * The `product` field is either a populated Product document or a raw product ID string.
 */
export interface OfferItem {
  product: string | Product;
  quantity: number;
}

/**
 * A bundle / promotional offer (e.g. family pack, weekend deal).
 * Matches the full Offer document returned by /api/v1/offers.
 */
export interface Offer {
  _id: string;
  title: string;
  slug: string;
  description: string;
  image: string;
  /** Optional marketing badge text (e.g. "الأكثر مبيعاً"). Null if none. */
  badgeText: string | null;
  items: OfferItem[];
  originalPrice: number;
  offerPrice: number;
  /** Auto-calculated by backend: Math.round((1 - offerPrice/originalPrice) * 100) */
  discountPercentage: number;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Payload for creating or updating an offer (Admin only) */
export interface OfferPayload {
  title: string;
  slug?: string;
  description?: string;
  image: string;
  badgeText?: string | null;
  items: { product: string; quantity: number }[];
  originalPrice: number;
  offerPrice: number;
  isActive?: boolean;
  startDate?: string | null;
  endDate?: string | null;
}

export type OfferResponse = ApiResponse<Offer>;
export type OfferListResponse = ApiResponse<Offer[]>;
