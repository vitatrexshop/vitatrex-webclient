import { Injectable } from '@angular/core';
import { CartItem } from '../models/cart.model';

/**
 * GA4 Analytics Service — Vitatrex
 *
 * Wraps window.gtag() to provide strongly-typed, ecommerce-aware event tracking.
 * All methods are silent no-ops when gtag is blocked (ad-blockers, privacy browsers)
 * so they never throw or break the application.
 *
 * Usage:
 *   inject(AnalyticsService).trackAddToCart(product, variant);
 */

// Extend Window type to include gtag without modifying global typings
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

/** GA4 item shape (subset of full spec used in Vitatrex) */
export interface GA4Item {
  item_id: string;
  item_name: string;
  item_category?: string;
  price: number;
  quantity?: number;
  currency?: string;
  discount?: number;
}

@Injectable({ providedIn: 'root' })
export class AnalyticsService {

  // ─── Private ─────────────────────────────────────────────────────────────

  /** Safely call gtag — swallows errors if script is blocked */
  private gtag(command: string, action: string, params?: Record<string, any>): void {
    try {
      if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
        window.gtag(command, action, params);
      }
    } catch {
      // Silent fail — never crash the app due to analytics
    }
  }

  /** Map a CartItem to a GA4 item object */
  private cartItemToGA4(item: CartItem): GA4Item {
    return {
      item_id: item.product._id,
      item_name: item.product.name,
      item_category: item.isBundle
        ? 'bundle'
        : typeof item.product.category === 'string'
          ? item.product.category
          : (item.product.category as any)?.name ?? 'supplement',
      price: item.selectedVariant.price,
      quantity: item.quantity,
      currency: 'EGP',
      discount: item.selectedVariant.originalPrice
        ? item.selectedVariant.originalPrice - item.selectedVariant.price
        : 0,
    };
  }

  // ─── Page Tracking ────────────────────────────────────────────────────────

  /**
   * Send a page_view event to GA4.
   * Called by AppComponent on every NavigationEnd router event.
   */
  trackPageView(url: string, title?: string): void {
    this.gtag('event', 'page_view', {
      page_path: url,
      page_title: title ?? document.title,
      page_location: window.location.href,
    });
  }

  // ─── Product Events ───────────────────────────────────────────────────────

  /**
   * Track when a user views a product (product detail page or card impression).
   */
  trackViewItem(item: GA4Item): void {
    this.gtag('event', 'view_item', {
      currency: 'EGP',
      value: item.price,
      items: [item],
    });
  }

  /**
   * Track add_to_cart from any "Add to Cart" button.
   * @param cartItem  The cart item that was just added
   */
  trackAddToCart(cartItem: CartItem): void {
    const ga4Item = this.cartItemToGA4(cartItem);
    this.gtag('event', 'add_to_cart', {
      currency: 'EGP',
      value: cartItem.itemTotal,
      items: [ga4Item],
    });
  }

  /**
   * Track remove_from_cart when user deletes a line.
   */
  trackRemoveFromCart(cartItem: CartItem): void {
    const ga4Item = this.cartItemToGA4(cartItem);
    this.gtag('event', 'remove_from_cart', {
      currency: 'EGP',
      value: cartItem.itemTotal,
      items: [ga4Item],
    });
  }

  // ─── Cart Drawer Events ───────────────────────────────────────────────────

  /**
   * Track when the cart drawer is opened.
   * Custom event — visible in GA4 > Events as "open_cart".
   */
  trackOpenCart(itemCount: number, cartValue: number): void {
    this.gtag('event', 'open_cart', {
      currency: 'EGP',
      item_count: itemCount,
      value: cartValue,
    });
  }

  // ─── Checkout Events ──────────────────────────────────────────────────────

  /**
   * Track begin_checkout — GA4 standard ecommerce event.
   * Fire when user clicks the checkout CTA button.
   */
  trackBeginCheckout(items: CartItem[], total: number): void {
    this.gtag('event', 'begin_checkout', {
      currency: 'EGP',
      value: total,
      items: items.map((i) => this.cartItemToGA4(i)),
    });
  }

  /**
   * Track purchase — GA4 standard ecommerce event.
   * Fire after successful order placement.
   */
  trackPurchase(
    orderId: string,
    items: CartItem[],
    total: number,
    shipping: number = 0,
    coupon?: string
  ): void {
    this.gtag('event', 'purchase', {
      transaction_id: orderId,
      currency: 'EGP',
      value: total,
      shipping,
      coupon: coupon ?? '',
      items: items.map((i) => this.cartItemToGA4(i)),
    });
  }

  // ─── General Custom Event ─────────────────────────────────────────────────

  /**
   * Generic method for firing any custom GA4 event.
   * Use this for one-off events (quiz_start, coupon_applied, etc.)
   */
  trackEvent(eventName: string, params?: Record<string, any>): void {
    this.gtag('event', eventName, params);
  }
}
