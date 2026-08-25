import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild
} from '@angular/core';
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

  constructor(
    private readonly cartService: CartService,
    private readonly cartDrawerService: CartDrawerService,
    private readonly toastService: ToastService,
    private readonly flyToCartService: FlyToCartService
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

  /** Reinitialise selected variant whenever @Input product changes */
  ngOnChanges(changes: SimpleChanges): void {
    if (this.product?.variants?.length) {
      this.selectedVariant = this.product.variants[0];
    }
  }

  @HostListener('mouseenter')
  onMouseEnter(): void {
    const primaryEl = this.primaryImgRef?.nativeElement;
    const secondaryEl = this.secondaryImgRef?.nativeElement;

    if (secondaryEl && primaryEl) {
      gsap.to(primaryEl, {
        opacity: 0,
        scale: 1.05,
        duration: 0.4,
        ease: 'power2.out',
        overwrite: 'auto'
      });
      gsap.to(secondaryEl, {
        opacity: 1,
        scale: 1.05,
        duration: 0.4,
        ease: 'power2.out',
        overwrite: 'auto'
      });
    } else if (primaryEl) {
      gsap.to(primaryEl, {
        scale: 1.05,
        duration: 0.4,
        ease: 'power2.out',
        overwrite: 'auto'
      });
    }
  }

  @HostListener('mouseleave')
  onMouseLeave(): void {
    const primaryEl = this.primaryImgRef?.nativeElement;
    const secondaryEl = this.secondaryImgRef?.nativeElement;

    if (secondaryEl && primaryEl) {
      gsap.to(primaryEl, {
        opacity: 1,
        scale: 1,
        duration: 0.35,
        ease: 'power2.out',
        overwrite: 'auto'
      });
      gsap.to(secondaryEl, {
        opacity: 0,
        scale: 1,
        duration: 0.35,
        ease: 'power2.out',
        overwrite: 'auto'
      });
    } else if (primaryEl) {
      gsap.to(primaryEl, {
        scale: 1,
        duration: 0.35,
        ease: 'power2.out',
        overwrite: 'auto'
      });
    }
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
