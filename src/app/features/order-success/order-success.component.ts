import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  OnInit,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateService } from '@ngx-translate/core';
import { OrderService } from '../../core/services/order.service';
import { ToastService } from '../../core/services/toast.service';
import { OrderTrackingService } from '../track-order/order-tracking.service';
import { LanguageService } from '../../core/services/language.service';
import {
  Order,
  OrderItem,
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
} from '../../core/models/order.model';
import { Product } from '../../core/models/product.model';

@Component({
  selector: 'app-order-success',
  templateUrl: './order-success.component.html',
  styleUrls: ['./order-success.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderSuccessComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly orderService = inject(OrderService);
  private readonly trackingService = inject(OrderTrackingService);
  private readonly toastService = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly translate = inject(TranslateService);
  readonly languageService = inject(LanguageService);

  order: Order | null = null;
  isLoading = true;
  orderNumber = '';
  searchQuery = '';
  copiedLink = false;

  get storedToken(): string | null {
    const stored = this.trackingService.getFromStorage();
    if (stored && stored.orderNumber === this.order?.orderNumber) {
      return stored.trackingToken;
    }
    return null;
  }

  get trackingUrl(): string {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    if (this.storedToken) {
      return `${origin}/track?id=${this.order?.orderNumber}&token=${this.storedToken}`;
    }
    return `${origin}/track?id=${this.order?.orderNumber ?? ''}`;
  }

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        map((params) => params.get('orderNumber') ?? ''),
        switchMap((orderNumber) => {
          this.orderNumber = orderNumber.trim();
          this.searchQuery = this.orderNumber;
          if (!this.orderNumber) {
            this.isLoading = false;
            this.cdr.markForCheck();
            return of(null);
          }
          this.isLoading = true;
          this.cdr.markForCheck();
          return this.orderService.getOrderByNumber(this.orderNumber).pipe(
            catchError((err) => {
              console.error('Failed to load order:', err);
              return of(null);
            })
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((order) => {
        this.order = order;
        this.isLoading = false;
        this.cdr.markForCheck();
      });
  }

  copyTrackingLink(): void {
    if (!this.trackingUrl) return;
    navigator.clipboard.writeText(this.trackingUrl).then(() => {
      this.copiedLink = true;
      this.toastService.show(this.translate.instant('SUCCESS_PAGE.MAGIC_LINK_COPIED'), 'success');
      this.cdr.markForCheck();
      setTimeout(() => {
        this.copiedLink = false;
        this.cdr.markForCheck();
      }, 3000);
    });
  }

  searchOrder(num: string): void {
    const cleanNum = num.trim().toUpperCase();
    if (!cleanNum) return;
    this.router.navigate(['/order-success', cleanNum]);
  }

  getStatusStep(status?: string): number {
    switch (status?.toLowerCase()) {
      case 'pending': return 1;
      case 'processing': return 2;
      case 'shipped': return 3;
      case 'delivered': return 4;
      default: return 0;
    }
  }

  isStepComplete(stepIndex: number, status?: string): boolean {
    const current = this.getStatusStep(status);
    if (current === 0) return false;
    return current >= stepIndex;
  }

  isStepActive(stepIndex: number, status?: string): boolean {
    return this.getStatusStep(status) === stepIndex;
  }

  getStatusTitle(status?: string): string {
    switch (status?.toLowerCase()) {
      case 'pending':
        return this.translate.instant('SUCCESS_PAGE.STATUS_TITLES.PENDING');
      case 'processing':
        return this.translate.instant('SUCCESS_PAGE.STATUS_TITLES.PROCESSING');
      case 'shipped':
        return this.translate.instant('SUCCESS_PAGE.STATUS_TITLES.SHIPPED');
      case 'delivered':
        return this.translate.instant('SUCCESS_PAGE.STATUS_TITLES.DELIVERED');
      case 'cancelled':
        return this.translate.instant('SUCCESS_PAGE.STATUS_TITLES.CANCELLED');
      default:
        return this.translate.instant('SUCCESS_PAGE.STATUS_TITLES.PENDING');
    }
  }

  getStatusDescription(status?: string): string {
    switch (status?.toLowerCase()) {
      case 'pending':
        return this.translate.instant('SUCCESS_PAGE.STATUS_DESCRIPTIONS.PENDING');
      case 'processing':
        return this.translate.instant('SUCCESS_PAGE.STATUS_DESCRIPTIONS.PROCESSING');
      case 'shipped':
        return this.translate.instant('SUCCESS_PAGE.STATUS_DESCRIPTIONS.SHIPPED');
      case 'delivered':
        return this.translate.instant('SUCCESS_PAGE.STATUS_DESCRIPTIONS.DELIVERED');
      case 'cancelled':
        return this.translate.instant('SUCCESS_PAGE.STATUS_DESCRIPTIONS.CANCELLED');
      default:
        return this.translate.instant('SUCCESS_PAGE.STATUS_DESCRIPTIONS.PENDING');
    }
  }

  getStatusLabel(status?: string): string {
    if (!status) return this.translate.instant('TRACKING.STATUS.PENDING');
    return this.translate.instant('TRACKING.STATUS.' + status.toUpperCase()) || status;
  }

  getPaymentMethodLabel(method?: string): string {
    if (method === 'cod') return this.translate.instant('CHECKOUT.COD');
    if (method === 'card') return this.translate.instant('CHECKOUT.CARD');
    return method ?? this.translate.instant('CHECKOUT.COD');
  }

  getPaymentStatusLabel(status?: string): string {
    if (status === 'paid') return this.translate.instant('SUCCESS_PAGE.PAYMENT_STATUS_PAID');
    return this.translate.instant('SUCCESS_PAGE.PAYMENT_STATUS_UNPAID');
  }

  getProductName(item: OrderItem): string {
    if (!item) return 'Vitatrex';
    if (typeof item.product === 'object' && item.product && (item.product as Product).name) {
      return (item.product as Product).name;
    }
    return 'Vitatrex Vitamin Gummies';
  }

  getProductImage(item: OrderItem): string {
    if (!item) return 'assets/images/hero-fallback.webp';
    if (typeof item.product === 'object' && item.product && (item.product as Product).image) {
      return (item.product as Product).image;
    }
    return 'assets/images/hero-fallback.webp';
  }

  getEstimatedDelivery(createdAt?: string): string {
    if (!createdAt) return this.translate.instant('TRACKING.DELIVERY_TIME_FRAME');
    const date = new Date(createdAt);
    const minDate = new Date(date);
    minDate.setDate(date.getDate() + 2);
    const maxDate = new Date(date);
    maxDate.setDate(date.getDate() + 4);

    const locale = this.languageService.currentLang === 'ar' ? 'ar-EG' : 'en-US';
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    };

    try {
      return `${minDate.toLocaleDateString(locale, options)} - ${maxDate.toLocaleDateString(locale, options)}`;
    } catch {
      return this.translate.instant('TRACKING.DELIVERY_TIME_FRAME');
    }
  }

  getWhatsAppLink(orderNumber: string): string {
    const isAr = this.languageService.currentLang === 'ar';
    const msg = isAr
      ? `مرحباً فيتاتريكس، أود الاستفسار عن حالة طلبي رقم: ${orderNumber}`
      : `Hello Vitatrex, I would like to inquire about my order #${orderNumber}`;
    return `https://wa.me/201000000000?text=${encodeURIComponent(msg)}`;
  }

  getSubtotal(order: Order): number {
    return order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }

  getShippingCost(order: Order): number {
    const sub = this.getSubtotal(order);
    return order.totalAmount > sub ? (order.totalAmount - sub) : 0;
  }

  trackByItemIndex(index: number): number {
    return index;
  }
}
