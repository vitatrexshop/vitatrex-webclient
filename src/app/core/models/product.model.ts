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

export interface ActiveIngredient {
  name: string;
  amountOrDescription?: string;
}

export interface ProductBadge {
  _id?: string;
  title: { ar: string; en: string } | string;
  iconUrl?: string;
  icon?: string;
}

export interface ProductFeature {
  _id?: string;
  title?: { ar: string; en: string } | string;
  name?: string;
  iconUrl?: string;
  icon?: string;
  type?: string;
}

export interface KeyBenefit {
  title: string;
  description?: string;
}

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
  ageSuitability?: string;
  dosageInstructions?: string;
  warnings?: string;
  activeIngredients?: ActiveIngredient[];
  keyBenefits?: KeyBenefit[];
  badges?: ProductBadge[];
  features?: (ProductFeature | ProductBadge | string)[];
  tags?: string[];
  freeShippingThreshold?: number;
  freeShippingMinAmount?: number;
  isFreeShipping?: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Convenience type aliases for API responses */
export type ProductResponse = ApiResponse<Product>;
export type ProductListResponse = ApiResponse<Product[]>;
