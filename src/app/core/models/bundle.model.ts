import { ApiResponse } from './api-response.model';
import { Product } from './product.model';

export interface Bundle {
  _id: string;
  title: string;
  slug: string;
  description: string;
  image: string;
  badgeText: string | null;
  allowedProducts: (string | Product)[];
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
  allowedProducts: string[];
  bundlePrice: number;
  originalPrice: number;
  isActive?: boolean;
  startDate?: string | null;
  endDate?: string | null;
}

export interface BundleOrderPayload {
  bundleId: string;
  selectedProductIds: string[];
  customer: {
    name: string;
    phone: string;
    email?: string;
    address: string;
    city: string;
  };
  paymentMethod?: 'cod' | 'card';
}

export type BundleResponse = ApiResponse<Bundle>;
export type BundleListResponse = ApiResponse<Bundle[]>;
