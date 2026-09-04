import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Observable } from 'rxjs';
import { CartService } from '../../../core/services/cart.service';
import { CartDrawerService } from '../../../core/services/cart-drawer.service';
import { CartItem } from '../../../core/models/cart.model';
import { environment } from '../../../../environments/environment';
import { AnalyticsService } from '../../../core/services/analytics.service';

/**
 * Slide-over shopping cart drawer.
 * Rendered once in app.component.html — always present in the DOM
 * so CSS transitions work smoothly.
 * Open/close state is driven by CartDrawerService.isOpen$.
 */
@Component({
  selector: 'app-cart-drawer',
  templateUrl: './cart-drawer.component.html',
  styleUrls: ['./cart-drawer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartDrawerComponent {
  readonly FREE_SHIPPING_THRESHOLD = 500; // EGP

  readonly isOpen$: Observable<boolean>;
  readonly cartItems$: Observable<CartItem[]>;
  readonly cartTotal$: Observable<number>;
  readonly itemCount$: Observable<number>;

  constructor(
    private readonly cartService: CartService,
    private readonly cartDrawerService: CartDrawerService,
    private readonly analytics: AnalyticsService,
  ) {
    this.isOpen$ = this.cartDrawerService.isOpen$;
    this.cartItems$ = this.cartService.cartItems$;
    this.cartTotal$ = this.cartService.cartTotal$;
    this.itemCount$ = this.cartService.itemCount$;
  }

  close(): void {
    this.cartDrawerService.close();
  }

  /**
   * Called when user clicks the Checkout CTA.
   * Fires GA4 begin_checkout before closing the drawer and navigating.
   */
  onCheckout(): void {
    const items = this.cartService.snapshot;
    const total = items.reduce((sum, i) => sum + i.itemTotal, 0);
    this.analytics.trackBeginCheckout(items, total);
    this.close();
  }

  increment(item: CartItem): void {
    const max = item.selectedVariant.stock !== -1 ? item.selectedVariant.stock : 999;
    if (item.quantity < max) {
      this.cartService.updateQuantity(
        item.product._id,
        item.selectedVariant.count,
        item.quantity + 1
      );
    }
  }

  decrement(item: CartItem): void {
    this.cartService.updateQuantity(
      item.product._id,
      item.selectedVariant.count,
      item.quantity - 1
    );
  }

  remove(item: CartItem): void {
    this.cartService.removeFromCart(item.product._id, item.selectedVariant.count);
  }

  getShippingProgress(total: number): number {
    return Math.min(100, Math.round((total / this.FREE_SHIPPING_THRESHOLD) * 100));
  }

  getRemaining(total: number): number {
    return Math.max(0, this.FREE_SHIPPING_THRESHOLD - total);
  }

  formatMediaUrl(url?: string): string {
    if (!url) return '';
    const raw = url.trim();
    if (raw.startsWith('http') || raw.startsWith('blob:') || raw.startsWith('assets/')) return raw;
    if (raw.startsWith('/uploads')) return `${environment.mediaBaseUrl}${raw}`;
    if (raw.startsWith('uploads')) return `${environment.mediaBaseUrl}/${raw}`;
    return raw;
  }

  trackById(_: number, item: CartItem): string {
    return `${item.product._id}-${item.selectedVariant.count}`;
  }
}
