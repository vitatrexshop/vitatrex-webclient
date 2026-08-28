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
  copiedOrderNumber = false;

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

  get trackOrderPageUrl(): string {
    if (this.storedToken) {
      return `/track?id=${this.order?.orderNumber}&token=${this.storedToken}`;
    }
    return `/track?id=${this.order?.orderNumber ?? ''}`;
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
      const msg = this.languageService.currentLang === 'ar' ? 'تم نسخ رابط التتبع بنجاح' : 'Tracking link copied!';
      this.toastService.show(msg, 'success');
      this.cdr.markForCheck();
      setTimeout(() => {
        this.copiedLink = false;
        this.cdr.markForCheck();
      }, 3000);
    });
  }

  copyOrderNumber(): void {
    if (!this.order?.orderNumber) return;
    navigator.clipboard.writeText(this.order.orderNumber).then(() => {
      this.copiedOrderNumber = true;
      const msg = this.languageService.currentLang === 'ar' ? 'تم نسخ رقم الطلب بنجاح' : 'Order number copied!';
      this.toastService.show(msg, 'success');
      this.cdr.markForCheck();
      setTimeout(() => {
        this.copiedOrderNumber = false;
        this.cdr.markForCheck();
      }, 2500);
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
      default: return 1;
    }
  }

  isStepComplete(stepIndex: number, status?: string): boolean {
    const current = this.getStatusStep(status);
    return current >= stepIndex;
  }

  isStepActive(stepIndex: number, status?: string): boolean {
    return this.getStatusStep(status) === stepIndex;
  }

  getStatusTitle(status?: string): string {
    const isAr = this.languageService.currentLang === 'ar';
    switch (status?.toLowerCase()) {
      case 'pending':
        return isAr ? 'شكراً لتسوقك معنا! تم تأكيد طلبك بنجاح' : 'Thank you for your purchase! Your order is confirmed.';
      case 'processing':
        return isAr ? 'طلبك قيد التجهيز والتعبئة بالمستودع' : 'Your order is being processed in our warehouse.';
      case 'shipped':
        return isAr ? 'طلبك تم شحنه وهو الآن في الطريق إليك' : 'Your order has been shipped and is on the way!';
      case 'delivered':
        return isAr ? 'تم تسليم الطلب بنجاح' : 'Your order has been delivered successfully!';
      case 'cancelled':
        return isAr ? 'تم إلغاء هذا الطلب' : 'This order has been cancelled.';
      default:
        return isAr ? 'شكراً لتسوقك معنا! تم تأكيد طلبك بنجاح' : 'Thank you for your purchase! Your order is confirmed.';
    }
  }

  getStatusDescription(status?: string): string {
    const isAr = this.languageService.currentLang === 'ar';
    switch (status?.toLowerCase()) {
      case 'pending':
        return isAr
          ? 'تم تسجيل طلبك بنجاح وسيقوم فريقنا بمراجعته وتجهيزه للشحن بأسرع وقت.'
          : 'Your order was placed successfully. Our team will review and prepare it for dispatch shortly.';
      case 'processing':
        return isAr
          ? 'يتم الآن فحص وتغليف منتجاتك بعناية في مستودعات فيتاتريكس لضمان أعلى جودة.'
          : 'Your products are being inspected and packed in our warehouse with highest quality care.';
      case 'shipped':
        return isAr
          ? 'شحنتك خرجت مع مندوب الشحن وسيقوم بالاتصال بك هاتفياً لتسليم الطلب.'
          : 'Your package is on the way with our delivery partner and they will contact you soon.';
      case 'delivered':
        return isAr
          ? 'تم تسليم الشحنة بنجاح واستلام المبلغ. نتمنى لك دوام الصحة والعافية!'
          : 'Your order has been delivered. Wishing you good health and vitality with Vitatrex!';
      case 'cancelled':
        return isAr
          ? 'تم إلغاء هذا الطلب. إذا كان لديك أي استفسار يسعدنا تواصلك معنا مباشرة.'
          : 'This order was cancelled. Please contact our support if you need any assistance.';
      default:
        return isAr
          ? 'تم تسجيل طلبك بنجاح وسيقوم فريقنا بمراجعته وتجهيزه للشحن بأسرع وقت.'
          : 'Your order was placed successfully.';
    }
  }

  getStatusLabel(status?: string): string {
    if (!status) return this.languageService.currentLang === 'ar' ? 'تم تأكيد الطلب' : 'Order Placed';
    const isAr = this.languageService.currentLang === 'ar';
    switch (status.toLowerCase()) {
      case 'pending': return isAr ? 'تم التأكيد' : 'Confirmed';
      case 'processing': return isAr ? 'جاري التجهيز' : 'Processing';
      case 'shipped': return isAr ? 'تم الشحن' : 'Shipped';
      case 'delivered': return isAr ? 'تم التسليم' : 'Delivered';
      case 'cancelled': return isAr ? 'ملغي' : 'Cancelled';
      default: return status;
    }
  }

  getPaymentMethodLabel(method?: string): string {
    const isAr = this.languageService.currentLang === 'ar';
    if (method === 'cod') return isAr ? 'الدفع نقداً عند الاستلام (COD)' : 'Cash On Delivery (COD)';
    if (method === 'card') return isAr ? 'بطاقة بنكية (فيزا / ماستركارد)' : 'Credit / Debit Card';
    return method ?? (isAr ? 'الدفع عند الاستلام' : 'Cash on Delivery');
  }

  getPaymentStatusLabel(status?: string): string {
    const isAr = this.languageService.currentLang === 'ar';
    if (status === 'paid') return isAr ? 'مدفوع إلكترونياً' : 'Paid';
    return isAr ? 'يُدفع عند الاستلام' : 'Cash upon Delivery';
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
    if (!createdAt) return this.languageService.currentLang === 'ar' ? 'خلال 2 - 4 أيام عمل' : 'Within 2-4 business days';
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
      return this.languageService.currentLang === 'ar' ? 'خلال 2 - 4 أيام عمل' : 'Within 2-4 business days';
    }
  }

  getWhatsAppLink(orderNumber: string): string {
    const isAr = this.languageService.currentLang === 'ar';
    const msg = isAr
      ? `مرحباً فيتاتريكس، أود الاستفسار عن حالة طلبي رقم: #${orderNumber}`
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

