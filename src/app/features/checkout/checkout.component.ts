import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { take } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import { CartService } from '../../core/services/cart.service';
import { OrderService } from '../../core/services/order.service';
import { PaymentService } from '../../core/services/payment.service';
import { ShippingService } from '../../core/services/shipping.service';
import { ToastService } from '../../core/services/toast.service';
import { CouponService } from '../../core/services/coupon.service';
import { SettingsService } from '../../core/services/settings.service';
import { CartItem } from '../../core/models/cart.model';
import { OrderInput, PaymentMethod, CreateOrderData, GovernorateOption, OrderItemInput } from '../../core/models/order.model';
import { ApplyCouponResponse } from '../../core/models/coupon.model';
import { OrderTrackingService } from '../track-order/order-tracking.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly cartService = inject(CartService);
  private readonly orderService = inject(OrderService);
  private readonly paymentService = inject(PaymentService);
  private readonly shippingService = inject(ShippingService);
  private readonly toastService = inject(ToastService);
  private readonly couponService = inject(CouponService);
  private readonly settingsService = inject(SettingsService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly trackingService = inject(OrderTrackingService);
  private readonly translate = inject(TranslateService);

  form!: FormGroup;
  cartItems: CartItem[] = [];
  cartTotal = 0;
  isSubmitting = false;
  isLoadingGovernorates = true;
  formSubmitted = false;
  orderSubmissionError: string | null = null;

  governorates: GovernorateOption[] = [];

  // ── Coupon State ──────────────────────────────────────────────────────────
  couponCode = '';
  appliedCoupon: ApplyCouponResponse | null = null;
  couponError: string | null = null;
  isApplyingCoupon = false;

  shippingThreshold = 500;
  isFreeShippingEnabled = true;

  get SHIPPING_THRESHOLD(): number {
    return this.shippingThreshold;
  }

  get selectedGovernorateOption(): GovernorateOption | null {
    const govName = this.form?.get('governorate')?.value;
    if (!govName) return null;
    return this.governorates.find((g) => g.governorate === govName) ?? null;
  }

  get baseShippingFee(): number {
    return this.selectedGovernorateOption ? this.selectedGovernorateOption.fee : 0;
  }

  get shippingCost(): number {
    if (!this.selectedGovernorateOption) return 0;
    return this.cartTotal >= this.SHIPPING_THRESHOLD ? 0 : this.baseShippingFee;
  }

  get isFreeShipping(): boolean {
    return !!this.selectedGovernorateOption && this.cartTotal >= this.SHIPPING_THRESHOLD;
  }

  get deliveryTimeHours(): number | null {
    return this.selectedGovernorateOption?.deliveryTimeHours ?? null;
  }

  /** Discount amount from applied coupon (0 if none) */
  get couponDiscount(): number {
    return this.appliedCoupon ? this.appliedCoupon.discountAmount : 0;
  }

  /** Final order total = subtotal + shipping - coupon discount */
  get orderTotal(): number {
    return Math.max(0, this.cartTotal + this.shippingCost - this.couponDiscount);
  }

  get selectedPaymentMethod(): PaymentMethod {
    return this.form?.get('paymentMethod')?.value ?? 'cod';
  }

  /** Returns true if this cart item has the lowest unit price (coupon target) */
  isLowestPricedItem(item: CartItem): boolean {
    if (!this.appliedCoupon || this.cartItems.length <= 1) return false;
    const price = item.isOffer && item.offerMeta
      ? item.offerMeta.offerPrice
      : item.isBundle && item.bundleMeta
      ? item.bundleMeta.bundlePrice
      : item.selectedVariant.price;
    return price === this.appliedCoupon.lowestItemPrice;
  }

  /** Returns original price if item has a discount */
  getOriginalPrice(item: CartItem): number | null {
    if (item.isBundle && item.bundleMeta?.originalPrice && item.bundleMeta.originalPrice > item.bundleMeta.bundlePrice) {
      return item.bundleMeta.originalPrice;
    }
    if (item.isOffer && item.offerMeta?.originalPrice && item.offerMeta.originalPrice > item.offerMeta.offerPrice) {
      return item.offerMeta.originalPrice;
    }
    if (item.selectedVariant?.originalPrice && item.selectedVariant.originalPrice > item.selectedVariant.price) {
      return item.selectedVariant.originalPrice;
    }
    return null;
  }

  /** Safely gets thumbnail image for products, bundles, or offers */
  getItemImage(item: CartItem): string {
    if (item.isOffer && item.offerMeta?.offerImage) {
      return item.offerMeta.offerImage;
    }
    if (item.isBundle && item.bundleMeta?.bundleImage) {
      return item.bundleMeta.bundleImage;
    }
    return item.product?.image ?? '';
  }

  ngOnInit(): void {
    this.settingsService
      .getShippingSettings()
      .pipe(take(1))
      .subscribe({
        next: (settings) => {
          if (settings) {
            this.shippingThreshold =
              typeof settings.freeShippingThreshold === 'number'
                ? settings.freeShippingThreshold
                : 500;
            this.isFreeShippingEnabled = settings.isFreeShippingEnabled !== false;
            this.cdr.markForCheck();
          }
        },
      });

    this.form = this.fb.group({
      name:           ['', [Validators.required, Validators.minLength(3)]],
      phone:          ['', [Validators.required, Validators.pattern(/^(01)[0125][0-9]{8}$/)]],
      governorate:    ['', Validators.required],
      addressDetails: ['', [Validators.required, Validators.minLength(10)]],
      paymentMethod:  ['cod', Validators.required],
    });

    // Automatically normalize phone input (convert Arabic numerals, remove spaces/hyphens/+20)
    this.form.get('phone')?.valueChanges.subscribe((val) => {
      if (val) {
        const normalized = this.normalizePhone(val);
        if (normalized !== val) {
          this.form.get('phone')?.setValue(normalized, { emitEvent: false });
        }
      }
    });

    // Re-render when governorate changes to immediately recalculate shipping breakdown
    this.form.get('governorate')?.valueChanges.subscribe(() => {
      this.cdr.markForCheck();
    });

    // Load dynamic governorates from backend
    this.shippingService.getGovernorates().subscribe({
      next: (list) => {
        this.governorates = list;
        this.isLoadingGovernorates = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoadingGovernorates = false;
        this.cdr.markForCheck();
      },
    });

    this.cartService.cartItems$.pipe(take(1)).subscribe((items) => {
      this.cartItems = items;
      this.cartTotal = items.reduce((sum, i) => sum + i.itemTotal, 0);
      if (!items || items.length === 0) {
        this.toastService.show('سلة التسوق فارغة، يرجى إضافة منتجات أولاً', 'info');
        this.router.navigate(['/shop']);
      }
      this.cdr.markForCheck();
    });
  }

  // ── Phone Normalization Helper ────────────────────────────────────────────

  normalizePhone(input: string): string {
    if (!input) return '';
    // Convert Arabic-Indic numerals (٠-٩) to standard ASCII digits (0-9)
    let cleaned = input.replace(/[٠-٩]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1632 + 48));
    // Strip spaces, dashes, dots, and parentheses
    cleaned = cleaned.replace(/[\s\-.()]/g, '');
    // Strip leading international Egyptian prefixes
    if (cleaned.startsWith('+20')) {
      cleaned = '0' + cleaned.slice(3);
    } else if (cleaned.startsWith('0020')) {
      cleaned = '0' + cleaned.slice(4);
    } else if (cleaned.startsWith('20') && cleaned.length === 12) {
      cleaned = '0' + cleaned.slice(2);
    }
    return cleaned;
  }

  // ── Coupon Methods ────────────────────────────────────────────────────────

  applyCoupon(): void {
    const code = this.couponCode.trim();
    if (!code || this.isApplyingCoupon) return;

    this.isApplyingCoupon = true;
    this.couponError = null;
    this.cdr.markForCheck();

    const cartItemsPayload = this.cartItems.map((item) => ({
      price: item.isOffer && item.offerMeta
        ? item.offerMeta.offerPrice
        : item.isBundle && item.bundleMeta
        ? item.bundleMeta.bundlePrice
        : (item.selectedVariant?.price ?? (item.itemTotal ? item.itemTotal / (item.quantity || 1) : 0)),
      quantity: item.quantity,
      name: item.isOffer && item.offerMeta
        ? item.offerMeta.offerTitle
        : item.isBundle && item.bundleMeta
        ? item.bundleMeta.bundleTitle
        : (item.product?.name ?? 'Product'),
    }));

    this.couponService.applyCoupon({ code, cartItems: cartItemsPayload }).subscribe({
      next: (result) => {
        this.appliedCoupon = result;
        this.isApplyingCoupon = false;
        this.couponError = null;
        this.toastService.show(`تم تطبيق كوبون "${result.appliedCouponCode}" — خصم ${result.discountAmount} جنيه`, 'success');
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.appliedCoupon = null;
        this.isApplyingCoupon = false;
        const serverMsg = err?.error?.message;
        if (serverMsg && typeof serverMsg === 'string' && !serverMsg.toLowerCase().includes('cors') && !serverMsg.toLowerCase().includes('internal server')) {
          this.couponError = serverMsg;
        } else if (err?.status === 404) {
          this.couponError = 'كود الخصم غير صحيح أو منتهي الصلاحية.';
        } else if (err?.status === 400) {
          this.couponError = serverMsg || 'لا يمكن تطبيق هذا الكوبون على المنتجات الحالية.';
        } else {
          this.couponError = 'تعذّر تطبيق كود الخصم، يرجى المحاولة مرة أخرى.';
        }
        this.cdr.markForCheck();
      },
    });
  }

  removeCoupon(): void {
    this.appliedCoupon = null;
    this.couponCode = '';
    this.couponError = null;
    this.cdr.markForCheck();
  }

  selectPayment(method: PaymentMethod): void {
    this.form.patchValue({ paymentMethod: method });
    this.cdr.markForCheck();
  }

  getFieldError(field: string): string | null {
    const ctrl = this.form.get(field);
    if (!ctrl || !ctrl.invalid || (!ctrl.touched && !this.formSubmitted)) return null;

    if (ctrl.hasError('required')) {
      if (field === 'governorate') return 'يرجى اختيار المحافظة لحساب تكلفة الشحن وموعد التوصيل';
      if (field === 'name') return 'يرجى إدخال اسم المستلم بالكامل';
      if (field === 'phone') return 'يرجى إدخال رقم الهاتف للتواصل';
      if (field === 'addressDetails') return 'يرجى كتابة تفاصيل العنوان كاملاً';
      return this.translate.instant('CHECKOUT.ERRORS.REQUIRED');
    }

    if (ctrl.hasError('minlength')) {
      return field === 'name'
        ? this.translate.instant('CHECKOUT.ERRORS.MIN_NAME')
        : this.translate.instant('CHECKOUT.ERRORS.MIN_ADDRESS');
    }

    if (ctrl.hasError('pattern')) {
      return this.translate.instant('CHECKOUT.ERRORS.INVALID_PHONE');
    }

    return this.translate.instant('CHECKOUT.ERRORS.REQUIRED');
  }

  isInvalid(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl && ctrl.invalid && (ctrl.touched || this.formSubmitted));
  }

  submitOrder(): void {
    this.formSubmitted = true;
    this.orderSubmissionError = null;
    this.form.markAllAsTouched();

    if (!this.cartItems || this.cartItems.length === 0) {
      this.orderSubmissionError = 'سلة التسوق فارغة، يرجى إضافة منتجات قبل إتمام الطلب.';
      this.toastService.show(this.orderSubmissionError, 'warning');
      this.router.navigate(['/shop']);
      return;
    }

    if (this.form.invalid || this.isSubmitting) {
      if (this.form.invalid) {
        this.orderSubmissionError = 'يرجى استكمال البيانات المطلوبة الموضحة باللون الأحمر قبل تأكيد الطلب.';
        setTimeout(() => {
          const firstInvalid = document.querySelector('.field-group.has-error');
          if (firstInvalid) {
            firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 60);
      }
      return;
    }

    this.isSubmitting = true;
    this.cdr.markForCheck();

    const rawPhone = this.form.get('phone')?.value ?? '';
    const phone = this.normalizePhone(rawPhone);
    const { name, governorate, addressDetails, paymentMethod } = this.form.value;

    const payload: OrderInput = {
      customer: {
        name: name.trim(),
        phone,
        city: governorate, // backward compatibility
        governorate,
        address: addressDetails.trim(),
      },
      items: this.cartItems.flatMap((item): OrderItemInput[] => {
        // 3-slot customisable bundle → flatten to individual products
        if (item.isBundle && item.bundleMeta) {
          return item.bundleMeta.selectedProducts.map((prod) => ({
            productId: prod._id,
            variantCount: prod.variants?.[0]?.count || 60,
            quantity: item.quantity,
          }));
        }
        // Promotional offer → send as atomic offer line (backend resolves price)
        if (item.isOffer && item.offerMeta) {
          return [{ offerId: item.offerMeta.offerId, quantity: item.quantity }];
        }
        // Standard product variant
        return [
          {
            productId: item.product._id,
            variantCount: item.selectedVariant.count,
            quantity: item.quantity,
          },
        ];
      }),
      paymentMethod,
      // Pass coupon data if applied
      ...(this.appliedCoupon && {
        couponCode: this.appliedCoupon.appliedCouponCode,
        discountAmount: this.appliedCoupon.discountAmount,
      }),
    };

    this.orderService.submitGuestOrder(payload).subscribe({
      next: (orderData: CreateOrderData) => {
        this.cartService.clearCart();

        try {
          if (orderData.trackingUrl) {
            const url = new URL(orderData.trackingUrl);
            const token = url.searchParams.get('token') ?? '';
            if (token) {
              this.trackingService.saveToStorage(orderData.orderNumber, token);
            }
          }
        } catch {
          // Ignore
        }

        if (paymentMethod === 'card') {
          this.paymentService.initiateKashierCheckout({
            orderId: orderData._id,
            orderNumber: orderData.orderNumber,
          }).subscribe({
            next: (kashierPayload) => {
              const redirectUrl = this.paymentService.buildKashierRedirectUrl(kashierPayload);
              window.location.href = redirectUrl;
            },
            error: (err) => {
              this.isSubmitting = false;
              this.cdr.markForCheck();
              const msg = err?.error?.message || 'تم تسجيل طلبك بنجاح، وجارٍ نقلك لتفاصيل الطلب.';
              this.toastService.show(msg, 'warning');
              this.router.navigate(['/order-success', orderData.orderNumber]);
            }
          });
        } else {
          this.toastService.show('تم استلام طلبك بنجاح! شكراً لاختيارك فيتاتريكس.', 'success');
          this.router.navigate(['/order-success', orderData.orderNumber]);
        }
      },
      error: (err) => {
        this.isSubmitting = false;
        let msg = 'حدث خطأ أثناء تقديم الطلب. يرجى المحاولة مرة أخرى.';
        if (err?.status === 0) {
          msg = 'تعذّر الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.';
        } else if (err?.error?.message && typeof err.error.message === 'string') {
          msg = err.error.message;
        } else if (err?.status === 400) {
          msg = 'يرجى مراجعة بيانات الطلب، بعض المنتجات أو العناوين غير صالحة.';
        } else if (err?.status >= 500) {
          msg = 'الخدمة غير متاحة مؤقتاً، نعمل على حل المشكلة حالياً. يرجى المحاولة بعد قليل.';
        }
        this.orderSubmissionError = msg;
        this.toastService.show(msg, 'error');
        this.cdr.markForCheck();
      },
    });
  }

  trackByItem(_: number, item: CartItem): string {
    return `${item.product._id}-${item.selectedVariant.count}`;
  }

  formatMediaUrl(url?: string): string {
    if (!url) return '';
    const raw = url.trim();
    if (raw.startsWith('http') || raw.startsWith('blob:') || raw.startsWith('assets/')) return raw;
    if (raw.startsWith('/uploads')) return `${environment.mediaBaseUrl}${raw}`;
    if (raw.startsWith('uploads')) return `${environment.mediaBaseUrl}/${raw}`;
    return raw;
  }
}



