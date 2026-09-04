import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AnalyticsService } from './analytics.service';
import { CartService } from './cart.service';

/**
 * Controls the open/close state of the slide-over cart drawer.
 * Consumed by HeaderComponent (trigger) and CartDrawerComponent (renderer).
 *
 * Fires GA4 "open_cart" custom event whenever the drawer is opened,
 * passing the current item count and cart value as parameters.
 */
@Injectable({ providedIn: 'root' })
export class CartDrawerService {
  private readonly _isOpen$ = new BehaviorSubject<boolean>(false);
  readonly isOpen$ = this._isOpen$.asObservable();

  constructor(
    private readonly analytics: AnalyticsService,
    private readonly cartService: CartService,
  ) {}

  open(): void {
    this._isOpen$.next(true);

    // GA4: fire open_cart with current cart state snapshot
    const items = this.cartService.snapshot;
    const total = items.reduce((sum, i) => sum + i.itemTotal, 0);
    const count = items.reduce((sum, i) => sum + i.quantity, 0);
    this.analytics.trackOpenCart(count, total);
  }

  close(): void  { this._isOpen$.next(false); }
  toggle(): void {
    if (this._isOpen$.value) {
      this.close();
    } else {
      this.open();
    }
  }
}
