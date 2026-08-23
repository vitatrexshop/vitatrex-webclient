import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { Offer, OfferItem } from '../../../core/models/offer.model';
import { Product } from '../../../core/models/product.model';

/**
 * Bundle / promotional offer card.
 * Handles the case where offer.items[].product is either a populated Product
 * document OR a raw ID string (depending on whether the backend populates it).
 */
@Component({
  selector: 'app-offer-card',
  templateUrl: './offer-card.component.html',
  styleUrls: ['./offer-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OfferCardComponent {
  @Input() offer!: Offer;

  /** Safely extracts the product name from a populated or unpopulated OfferItem */
  getItemProductName(item: OfferItem): string {
    if (item.product && typeof item.product === 'object') {
      return (item.product as Product).name;
    }
    return ''; // ID-only — backend did not populate
  }

  /** True if at least one item has a populated Product object */
  hasPopulatedItems(): boolean {
    return this.offer?.items?.some(i => typeof i.product === 'object') ?? false;
  }
}
