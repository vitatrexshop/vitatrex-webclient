import { ApiResponse } from './api-response.model';
import { Product } from './product.model';

export interface Bundle {
  _id: string;
  title: string;
  slug: string;
  description: string;
  image: string;
  badgeText: string | null;
  // ── NEW: مصفوفتان منفصلتان ──────────────────────────────────────
  paidProducts: (string | Product)[];  // 120 قطعة — خانات 01 و 02
  giftProducts: (string | Product)[];  // 60 قطعة — خانة 03 (الهدية)
  // ── REMOVED: allowedProducts ────────────────────────────────────
  bundlePrice: number;
  originalPrice: number;
  discountPercentage: number;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BundlePayload {
  title: string;
  slug?: string;
  description?: string;
  image: string;
  badgeText?: string | null;
  paidProducts: string[];
  giftProducts: string[];
  bundlePrice: number;
  originalPrice: number;
  isActive?: boolean;
  startDate?: string | null;
  endDate?: string | null;
}

export interface BundleOrderPayload {
  bundleId: string;
  selectedPaidProductIds: string[];  // exactly 2
  selectedGiftProductId: string;     // exactly 1
  customer: {
    name: string;
    phone: string;
    email?: string;
    address: string;
    governorate: string;
    city?: string;
  };
  paymentMethod?: 'cod' | 'card';
  couponCode?: string | null;
}

export type BundleResponse = ApiResponse<Bundle>;
export type BundleListResponse = ApiResponse<Bundle[]>;
