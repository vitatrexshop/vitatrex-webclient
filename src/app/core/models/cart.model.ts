import { Product, Variant } from './product.model';

export interface BundleCartSlotItem {
  product: Product;
  variantCount: number;
  quantity: number;
}

export interface BundleCartMeta {
  bundleId: string;
  bundleTitle: string;
  bundleImage: string;
  bundlePrice: number;
  originalPrice: number;
  discountPercentage: number;
  /** All 3 products chosen by the client for this bundle */
  selectedProducts: Product[];
  includedSummary: string;
  includedItems: string[];
}

/**
 * A single item in the client-side shopping cart.
 * Can represent either a single product variant or a complete bundle.
 */
export interface CartItem {
  product: Product;
  selectedVariant: Variant;
  quantity: number;
  /** Pre-computed line total: selectedVariant.price x quantity */
  itemTotal: number;

  /** True if this line represents an entire 3x1 customizable bundle */
  isBundle?: boolean;
  /** Extra metadata if isBundle === true */
  bundleMeta?: BundleCartMeta;
}
