import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { Router } from '@angular/router';
import { gsap } from 'gsap';
import { Product, Variant } from '../../../core/models/product.model';
import { CartService } from '../../../core/services/cart.service';
import { CartDrawerService } from '../../../core/services/cart-drawer.service';
import { ToastService } from '../../../core/services/toast.service';
import { FlyToCartService } from '../../../core/services/fly-to-cart.service';

/**
 * Reusable product card with GSAP hover image transition,
 * variant selection, fly-to-cart animation, and clean lifecycle management.
 */
@Component({
  selector: 'app-product-card',
  templateUrl: './product-card.component.html',
  styleUrls: ['./product-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductCardComponent implements OnChanges, OnDestroy {
  @Input() product!: Product;
  /** Pass true for the first visible card to mark its image as LCP */
  @Input() priority = false;

  @ViewChild('primaryImg', { static: false }) primaryImgRef?: ElementRef<HTMLImageElement>;
  @ViewChild('secondaryImg', { static: false }) secondaryImgRef?: ElementRef<HTMLImageElement>;

  selectedVariant: Variant | null = null;
  /** Tracks whether the primary product image has finished loading (for blur-up effect) */
  imgLoaded = false;

  constructor(
    private readonly router: Router,
    private readonly cartService: CartService,
    private readonly cartDrawerService: CartDrawerService,
    private readonly toastService: ToastService,
    private readonly flyToCartService: FlyToCartService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  get primaryImage(): string {
    return this.product?.image || (this.product?.images && this.product.images[0]) || 'assets/images/hero-fallback.webp';
  }

  get secondaryImage(): string | null {
    if (!this.product?.images || this.product.images.length === 0) return null;
    if (this.product.images.length > 1) {
      return this.product.images[1];
    }
    if (this.product.images[0] && this.product.images[0] !== this.product.image) {
      return this.product.images[0];
    }
    return null;
  }

  /** Returns true when the selected variant is out of stock */
  get isOutOfStock(): boolean {
    return !!(this.selectedVariant && this.selectedVariant.stock !== -1 && this.selectedVariant.stock <= 0);
  }

  /** Reinitialise selected variant whenever @Input product changes */
  ngOnChanges(changes: SimpleChanges): void {
    if (this.product?.variants?.length) {
      this.selectedVariant = this.product.variants[0];
    }
    // Reset blur-up state on product change
    this.imgLoaded = false;
  }

  /** Called when the primary image fires its (load) event — clears the blur-up skeleton */
  onImageLoad(): void {
    this.imgLoaded = true;
    this.cdr.markForCheck();
  }

  ngOnDestroy(): void {
    const primaryEl = this.primaryImgRef?.nativeElement;
    const secondaryEl = this.secondaryImgRef?.nativeElement;
    const elements: Element[] = [];
    if (primaryEl) elements.push(primaryEl);
    if (secondaryEl) elements.push(secondaryEl);

    if (elements.length > 0) {
      gsap.killTweensOf(elements);
    }
  }

  selectVariant(variant: Variant): void {
    this.selectedVariant = variant;
  }

  /** Navigate to the product detail page using the product slug */
  navigateToDetails(): void {
    if (this.product?.slug) {
      this.router.navigate(['/shop', this.product.slug]);
    }
  }

  addToCart(event: MouseEvent): void {
    if (!this.product || !this.selectedVariant) return;
    this.cartService.addToCart(this.product, this.selectedVariant, 1);
    this.flyToCartService.fly(event);
    this.toastService.show(`تمت إضافة ${this.product.name} للسلة`, 'success');
    this.cartDrawerService.open();
  }

  trackByCount(_: number, v: Variant): number {
    return v.count;
  }
}
