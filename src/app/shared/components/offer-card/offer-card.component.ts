import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { Offer, OfferItem } from '../../../core/models/offer.model';
import { Product } from '../../../core/models/product.model';
import { CartService } from '../../../core/services/cart.service';
import { CartDrawerService } from '../../../core/services/cart-drawer.service';

/**
 * Bundle / promotional offer card.
 * Handles adding the entire bundle offer as a single unit priced at offer.offerPrice.
 */
@Component({
  selector: 'app-offer-card',
  templateUrl: './offer-card.component.html',
  styleUrls: ['./offer-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OfferCardComponent {
  @Input() offer!: Offer;

  isAdding = false;

  constructor(
    private readonly cartService: CartService,
    private readonly cartDrawer: CartDrawerService,
    private readonly cdr: ChangeDetectorRef,
    private readonly router: Router
  ) {}

  /** Navigate to the offer details page using the offer slug or ID. */
  goToOfferDetails(offer: Offer): void {
    const identifier = offer?.slug || offer?._id;
    if (!identifier) return;
    this.router.navigate(['/offers', identifier]);
  }

  addToCart(event: Event): void {
    event.preventDefault();
    event.stopPropagation(); // Prevent card click / navigation
    if (!this.offer || this.isAdding) return;

    this.isAdding = true;
    this.cdr.markForCheck();

    this.cartService.addOfferToCart(this.offer, 1);
    this.cartDrawer.open();

    setTimeout(() => {
      this.isAdding = false;
      this.cdr.markForCheck();
    }, 1200);
  }

  /** Safely extracts the product name from a populated or unpopulated OfferItem */
  getItemProductName(item: OfferItem): string {
    if (item.product && typeof item.product === 'object') {
      return (item.product as Product).name;
    }
    return '';
  }

  /** True if at least one item has a populated Product object */
  hasPopulatedItems(): boolean {
    return this.offer?.items?.some((i) => typeof i.product === 'object') ?? false;
  }
}
