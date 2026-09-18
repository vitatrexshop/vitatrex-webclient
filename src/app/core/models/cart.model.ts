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
 * Metadata for a promotional Offer added as a single cart line item.
 * Child product names are stored for display purposes ONLY —
 * they do NOT contribute individually to pricing or stock deduction.
 */
export interface OfferCartMeta {
  offerId: string;
  offerTitle: string;
  offerImage: string;
  /** The actual offer price — this is the unit price for the entire offer bundle */
  offerPrice: number;
  originalPrice: number;
  discountPercentage: number;
  /** Human-readable list of included product names (display only) */
  includedItems: string[];
  /** e.g. "vision vitamins + iron vitamin" */
  includedSummary: string;
}

/**
 * A single item in the client-side shopping cart.
 * Can represent either a single product variant, a complete customizable bundle,
 * or a promotional offer treated as a single atomic line item.
 */
export interface CartItem {
  product: Product;
  selectedVariant: Variant;
  quantity: number;
  /** Pre-computed line total: unitPrice x quantity */
  itemTotal: number;

  /** True if this line represents an entire 3x1 customizable bundle */
  isBundle?: boolean;
  /** Extra metadata if isBundle === true */
  bundleMeta?: BundleCartMeta;

  /**
   * True if this line represents a promotional Offer (e.g. "باقه التوفير").
   * When true, the entire offer is ONE line item at offerMeta.offerPrice.
   * Child products are stored in offerMeta.includedItems for display ONLY.
   */
  isOffer?: boolean;
  /** Extra metadata if isOffer === true */
  offerMeta?: OfferCartMeta;
}
