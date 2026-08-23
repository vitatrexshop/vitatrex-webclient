import { ApiResponse } from './api-response.model';
import { Category } from './category.model';

/**
 * A single product variant (e.g. 60-count or 120-count gummy pack).
 * Matches the Variant sub-document in the backend Product schema.
 */
export interface Variant {
  _id?: string;
  /** Gummy count per bottle, e.g. 60 or 120 */
  count: number;
  /** Current selling price (EGP) */
  price: number;
  /** Original / crossed-out price for UI display. Null = no original price. */
  originalPrice: number | null;
  /** Calculated discount percentage badge value */
  discountPercentage: number;
  /** Available stock units. -1 = unlimited / unmanaged */
  stock: number;
}

/**
 * A Vitatrix product (health gummy bottle).
 * Matches the full Product document returned by /api/v1/products.
 */
export interface Product {
  _id: string;
  name: string;
  slug: string;
  description: string;
  benefits: string[];
  isBestSeller: boolean;
  isFeatured: boolean;
  image: string;
  images?: string[];
  variants: Variant[];
  isActive: boolean;
  category?: Category | string;
  createdAt: string;
  updatedAt: string;
}

/** Convenience type aliases for API responses */
export type ProductResponse = ApiResponse<Product>;
export type ProductListResponse = ApiResponse<Product[]>;
