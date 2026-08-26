import { ApiResponse } from './api-response.model';
import { Product } from './product.model';

export type PaymentMethod = 'cod' | 'card';
export type PaymentStatus = 'pending' | 'paid' | 'failed';
export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

/** Arabic display labels for order lifecycle statuses */
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending:    'قيد الانتظار',
  processing: 'جاري التجهيز',
  shipped:    'تم الشحن',
  delivered:  'تم التسليم',
  cancelled:  'ملغي',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'لم يُدفع',
  paid:    'مدفوع',
  failed:  'فشل الدفع',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cod:  'الدفع عند الاستلام',
  card: 'بطاقة بنكية',
};

/**
 * Egyptian governorate shipping matrix option returned by /api/v1/shipping/governorates
 */
export interface GovernorateOption {
  governorate: string;
  fee: number;
  deliveryTimeHours: number;
  zoneName?: string;
}

/**
 * Customer contact and shipping details attached to an order.
 * `email` is optional (guest checkout).
 */
export interface CustomerInfo {
  name: string;
  phone: string;
  email?: string | null;
  address: string;
  city?: string;
  governorate: string;
}

/**
 * A line item inside an order (as stored/returned by the backend).
 * `product` may be a plain ID string or a populated Product document.
 */
export interface OrderItem {
  _id?: string;
  product: string | Product;
  /** The gummy count of the selected variant (e.g. 60) */
  variantCount: number;
  quantity: number;
  /** Price snapshot captured at time of order — never changes retroactively */
  price: number;
}

/**
 * The request payload sent to POST /api/v1/orders for guest checkout.
 * Matches the backend order.service.js createOrder() expectations exactly.
 */
export interface OrderInput {
  customer: CustomerInfo;
  items: {
    productId: string;
    variantCount: number;
    quantity: number;
  }[];
  paymentMethod: PaymentMethod;
}

/**
 * A full Order document as returned by the backend.
 */
export interface Order {
  _id: string;
  orderNumber: string;
  customer: CustomerInfo;
  items: OrderItem[];
  subtotal?: number;
  shippingFee?: number;
  totalAmount: number;
  estimatedDeliveryDate?: string | null;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  paymentRef: string | null;
  createdAt: string;
  updatedAt: string;
}

export type OrderResponse = ApiResponse<Order>;
export type OrderListResponse = ApiResponse<Order[]>;

// ── Magic Link Order Tracking ─────────────────────────────────────────────────

/**
 * Slim response returned by POST /api/v1/orders after the tracking-token update.
 * The backend no longer returns the full Order document on creation — only this
 * lightweight object that contains the one-time trackingUrl.
 */
export interface CreateOrderData {
  orderNumber:   string;
  orderStatus:   OrderStatus;
  paymentMethod: PaymentMethod;
  totalAmount:   number;
  /** One-time magic link containing the raw token. Save immediately to localStorage. */
  trackingUrl:   string;
}

/** A single item as returned by the public /track endpoint (name + qty only, no PII). */
export interface TrackingItem {
  name:     string;
  quantity: number;
}

/**
 * Sanitized tracking data returned by GET /api/v1/orders/track.
 * Strips all customer PII and payment information.
 */
export interface TrackingData {
  orderNumber:       string;
  orderStatus:       OrderStatus;
  createdAt:         string;
  estimatedDelivery: string | null;
  items:             TrackingItem[];
}

export type CreateOrderResponse = ApiResponse<CreateOrderData>;
export type TrackingResponse    = ApiResponse<TrackingData>;
