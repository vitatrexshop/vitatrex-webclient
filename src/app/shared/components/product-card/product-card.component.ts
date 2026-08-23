import {
  ChangeDetectionStrategy, Component, OnChanges, Input
} from '@angular/core';
import { Product, Variant } from '../../../core/models/product.model';
import { CartService } from '../../../core/services/cart.service';
import { CartDrawerService } from '../../../core/services/cart-drawer.service';
import { ToastService } from '../../../core/services/toast.service';
import { FlyToCartService } from '../../../core/services/fly-to-cart.service';

/**
 * Reusable product card.
 * Variant selection is tracked as local state — safe with OnPush because
 * mutations only happen via DOM events (which trigger CD automatically).
 * The (click) event on variant chips mutates selectedVariant and Angular
 * re-renders the binding within the same CD cycle.
 */
@Component({
  selector: 'app-product-card',
  templateUrl: './product-card.component.html',
  styleUrls: ['./product-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductCardComponent implements OnChanges {
  @Input() product!: Product;
  /** Pass true for the first visible card to mark its image as LCP */
  @Input() priority = false;

  selectedVariant: Variant | null = null;

  constructor(
    private readonly cartService: CartService,
    private readonly cartDrawerService: CartDrawerService,
    private readonly toastService: ToastService,
    private readonly flyToCartService: FlyToCartService
  ) {}

  /** Reinitialise selected variant whenever @Input product changes */
  ngOnChanges(): void {
    if (this.product?.variants?.length) {
      this.selectedVariant = this.product.variants[0];
    }
  }

  selectVariant(variant: Variant): void {
    this.selectedVariant = variant;
  }

  addToCart(event: MouseEvent): void {
    if (!this.product || !this.selectedVariant) return;
    this.cartService.addToCart(this.product, this.selectedVariant, 1);
    this.flyToCartService.fly(event, this.getEmoji());
    this.toastService.show(`تمت إضافة ${this.product.name} للسلة ✅`, 'success');
    this.cartDrawerService.open();
  }

  private getEmoji(): string {
    if (!this.product) return '🍓';
    const text = (this.product.name + ' ' + (this.product.category || '')).toLowerCase();
    if (text.includes('kids') || text.includes('طفل') || text.includes('أطفال') || text.includes('صغار')) return '👶';
    if (text.includes('immune') || text.includes('مناعة') || text.includes('وقاية') || text.includes('درع')) return '🛡️';
    if (text.includes('sleep') || text.includes('نوم') || text.includes('هدوء')) return '😴';
    return '🍓';
  }

  trackByCount(_: number, v: Variant): number {
    return v.count;
  }
}
