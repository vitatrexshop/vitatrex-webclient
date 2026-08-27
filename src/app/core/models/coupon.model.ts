// ─── Coupon Domain Models ──────────────────────────────────────────────────────

export type DiscountType = 'percentage' | 'fixed';

export interface Coupon {
  _id: string;
  code: string;
  discountType: DiscountType;
  discountValue: number;
  minCartValue: number;
  usageLimit: number;
  usageCount: number;
  expiryDate: string; // ISO string
  isActive: boolean;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Apply Coupon ──────────────────────────────────────────────────────────────

/** A minimal cart item sent to the apply endpoint */
export interface CouponCartItem {
  price: number;     // unit price (selectedVariant.price)
  quantity: number;
  name: string;
}

export interface ApplyCouponRequest {
  code: string;
  cartItems: CouponCartItem[];
}

export interface ApplyCouponResponse {
  success: boolean;
  appliedCouponCode: string;
  subtotal: number;
  lowestItemPrice: number;
  discountAmount: number;
  grandTotal: number;
}

// ─── Admin CRUD ────────────────────────────────────────────────────────────────

export interface CreateCouponRequest {
  code?: string;          // If omitted, backend auto-generates
  discountType: DiscountType;
  discountValue: number;
  minCartValue?: number;
  usageLimit?: number;
  expiryDate: string;     // ISO date string
  isActive?: boolean;
  description?: string;
}

export interface UpdateCouponRequest extends Partial<CreateCouponRequest> {}
