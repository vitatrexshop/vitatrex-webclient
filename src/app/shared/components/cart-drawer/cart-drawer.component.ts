import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  Renderer2,
  ViewChild,
} from '@angular/core';
import { combineLatest, Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CartService } from '../../../core/services/cart.service';
import { CartDrawerService } from '../../../core/services/cart-drawer.service';
import { CartItem } from '../../../core/models/cart.model';
import { environment } from '../../../../environments/environment';
import { AnalyticsService } from '../../../core/services/analytics.service';
import { SettingsService } from '../../../core/services/settings.service';
import { ShippingSettings } from '../../../core/models/settings.model';

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
export class CartDrawerComponent implements OnInit, OnDestroy {
  readonly shippingSettings$: Observable<ShippingSettings>;
  readonly isOpen$: Observable<boolean>;
  readonly cartItems$: Observable<CartItem[]>;
  readonly cartTotal$: Observable<number>;
  readonly itemCount$: Observable<number>;

  currentThreshold = 500; // default fallback
  isFreeShippingEnabled = true;
  celebratingFreeShipping = false;

  private hasCelebrated = false;
  private readonly destroy$ = new Subject<void>();

  @ViewChild('confettiArea') confettiArea?: ElementRef<HTMLDivElement>;

  constructor(
    private readonly cartService: CartService,
    private readonly cartDrawerService: CartDrawerService,
    private readonly analytics: AnalyticsService,
    private readonly settingsService: SettingsService,
    private readonly cdr: ChangeDetectorRef,
    private readonly renderer: Renderer2,
  ) {
    this.isOpen$ = this.cartDrawerService.isOpen$;
    this.cartItems$ = this.cartService.cartItems$;
    this.cartTotal$ = this.cartService.cartTotal$;
    this.itemCount$ = this.cartService.itemCount$;
    this.shippingSettings$ = this.settingsService.getShippingSettings();
  }

  ngOnInit(): void {
    combineLatest([this.cartTotal$, this.shippingSettings$])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([total, settings]) => {
        if (settings) {
          this.currentThreshold = typeof settings.freeShippingThreshold === 'number' ? settings.freeShippingThreshold : 500;
          this.isFreeShippingEnabled = settings.isFreeShippingEnabled !== false;
        }

        if (this.isFreeShippingEnabled && total >= this.currentThreshold && total > 0) {
          if (!this.hasCelebrated) {
            this.hasCelebrated = true;
            this.celebratingFreeShipping = true;
            this.launchConfetti();
            this.cdr.markForCheck();
          }
        } else {
          this.hasCelebrated = false;
          this.celebratingFreeShipping = false;
          this.cdr.markForCheck();
        }
      });
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

  getShippingProgress(total: number, threshold: number = this.currentThreshold): number {
    const t = threshold > 0 ? threshold : 500;
    return Math.min(100, Math.round((total / t) * 100));
  }

  getRemaining(total: number, threshold: number = this.currentThreshold): number {
    const t = threshold > 0 ? threshold : 500;
    return Math.max(0, t - total);
  }

  /**
   * Spawns a celebratory particle confetti burst inside the drawer.
   */
  private launchConfetti(): void {
    const container = this.confettiArea?.nativeElement;
    if (!container) return;

    // Clear previous particles
    container.innerHTML = '';

    const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#10b981', '#f43f5e'];
    const particleCount = 28;

    for (let i = 0; i < particleCount; i++) {
      const particle = this.renderer.createElement('div');
      this.renderer.addClass(particle, 'confetti-piece');

      const color = colors[Math.floor(Math.random() * colors.length)];
      const left = Math.floor(Math.random() * 95) + '%';
      const delay = (Math.random() * 0.4).toFixed(2) + 's';
      const duration = (1.2 + Math.random() * 0.8).toFixed(2) + 's';
      const size = (6 + Math.random() * 6).toFixed(0) + 'px';

      this.renderer.setStyle(particle, 'background-color', color);
      this.renderer.setStyle(particle, 'left', left);
      this.renderer.setStyle(particle, 'width', size);
      this.renderer.setStyle(particle, 'height', size);
      this.renderer.setStyle(particle, 'animation-delay', delay);
      this.renderer.setStyle(particle, 'animation-duration', duration);

      this.renderer.appendChild(container, particle);
    }

    // Clean up after animation finishes
    setTimeout(() => {
      if (container) {
        container.innerHTML = '';
      }
    }, 2800);
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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

