import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Inject,
  OnInit,
  PLATFORM_ID,
  ViewChild,
  inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { take } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import { gsap } from 'gsap';
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
export class CheckoutComponent implements OnInit, AfterViewInit {

  // ── ViewChild refs for truck animation ─────────────────────────────────────
  @ViewChild('truckBtn') truckBtnEl?: ElementRef<HTMLButtonElement>;
  @ViewChild('truckEl')  truckEl?:    ElementRef<HTMLElement>;
  @ViewChild('boxEl')    boxEl?:      ElementRef<HTMLElement>;

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

  constructor(@Inject(PLATFORM_ID) private readonly platformId: object) {}

  form!: FormGroup;
  get checkoutForm(): FormGroup {
    return this.form;
  }
  cartItems: CartItem[] = [];
  cartTotal = 0;
  isSubmitting = false;
  isLoadingGovernorates = true;
  formSubmitted = false;
  orderSubmissionError: string | null = null;
  orderPlacedSuccess = false;

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

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngAfterViewInit(): void {
    // No GSAP setup needed; CSS transitions handle default/loading/done states.
    // GSAP is used only for the box-loading micro-animation on success.
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
      addressDetails: ['', [Validators.required, Validators.minLength(3)]],
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

  /**
   * Main entry point when user clicks the truck button or submits the form.
   */
  submitOrder(): void {
    this.onTruckButtonClick();
  }

  /**
   * Handles click on the Aaron Iker 3D Truck button.
   */
  onTruckButtonClick(e?: Event): void {
    if (e) {
      e.preventDefault();
    }

    if (!isPlatformBrowser(this.platformId)) return;

    const button = this.truckBtnEl?.nativeElement;
    if (!button) return;

    // If already in 'done' state, clicking again resets back to default (Aaron Iker toggle behavior)
    if (button.classList.contains('done')) {
      this.resetTruckButton();
      return;
    }

    // If currently animating or submitting, prevent duplicate triggers
    if (button.classList.contains('animation') || this.isSubmitting) {
      return;
    }

    this.formSubmitted = true;
    this.orderSubmissionError = null;

    // 1. Form Validation Check: If invalid, mark all touched, focus first invalid field, and return immediately
    if (this.checkoutForm.invalid) {
      this.checkoutForm.markAllAsTouched();
      this.orderSubmissionError = 'يرجى استكمال البيانات المطلوبة الموضحة باللون الأحمر قبل تأكيد الطلب.';
      this.toastService.show('يرجى ملء الحقول المطلوبة الموضحة باللون الأحمر', 'warning');
      this.cdr.markForCheck();
      this.focusFirstInvalidField();
      return;
    }

    // 2. Check cart items
    if (!this.cartItems || this.cartItems.length === 0) {
      this.orderSubmissionError = 'سلة التسوق فارغة، يرجى إضافة منتجات قبل إتمام الطلب.';
      this.toastService.show(this.orderSubmissionError, 'warning');
      this.cdr.markForCheck();
      return;
    }

    // 3. Execute Animation & Order Submission on Success (only when checkoutForm.valid evaluates to true)
    if (!this.checkoutForm.valid) {
      return;
    }

    // Form is VALID!
    // Start 3D truck animation AND submit backend order in parallel
    this.isSubmitting = true;
    this.cdr.markForCheck();

    let animFinished = false;
    let orderSuccessData: CreateOrderData | null = null;
    let submissionError: any = null;

    this.playTruckAnimation(button, () => {
      animFinished = true;
      if (orderSuccessData) {
        this.finishOrder(orderSuccessData);
      } else if (submissionError) {
        this.handleSubmissionError(submissionError);
      }
    });

    this.executeOrderSubmission(
      (data) => {
        orderSuccessData = data;
        if (animFinished) {
          this.finishOrder(data);
        }
      },
      (err) => {
        submissionError = err;
        if (animFinished) {
          this.handleSubmissionError(err);
        }
      }
    );
  }

  /**
   * Identifies and shifts focus to the first invalid input in the form.
   */
  private focusFirstInvalidField(): void {
    setTimeout(() => {
      const fieldOrder = ['name', 'phone', 'governorate', 'addressDetails'];
      for (const field of fieldOrder) {
        const ctrl = this.checkoutForm.get(field);
        if (ctrl && ctrl.invalid) {
          const el = document.querySelector<HTMLElement>(
            `[formControlName="${field}"], #${field === 'name' ? 'fullName' : field}`
          );
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.focus();
            return;
          }
        }
      }

      // Fallback selector if none matched in fieldOrder
      const fallbackEl = document.querySelector<HTMLElement>(
        '.field-group.has-error input, .field-group.has-error select, .field-group.has-error textarea, .ng-invalid[formControlName]'
      );
      if (fallbackEl) {
        fallbackEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        fallbackEl.focus();
      }
    }, 60);
  }

  /**
   * Aaron Iker 3D GSAP Truck Animation Sequence.
   */
  playTruckAnimation(button: HTMLElement, onComplete?: () => void): void {
    const box = (this.boxEl?.nativeElement || button.querySelector('.box')) as HTMLElement;
    const truck = (this.truckEl?.nativeElement || button.querySelector('.truck')) as HTMLElement;

    if (!box || !truck) {
      button.classList.add('done');
      onComplete?.();
      return;
    }

    // Add .animation class to flip button -90deg in 3D perspective
    button.classList.add('animation');

    // 1. Box scale & opacity reveal
    gsap.to(button, {
      '--box-s': 1,
      '--box-o': 1,
      duration: 0.3,
      delay: 0.5,
    });

    // 2. Box slides horizontally into position over the truck
    gsap.to(box, {
      x: 0,
      duration: 0.4,
      delay: 0.7,
    });

    // 3. Truck flap opens / adjusts
    gsap.to(button, {
      '--hx': -5,
      '--bx': 50,
      duration: 0.18,
      delay: 0.92,
    });

    // 4. Box drops down into the truck cargo bed
    gsap.to(box, {
      y: 0,
      duration: 0.1,
      delay: 1.15,
    });

    // 5. Truck dips under the cargo weight
    gsap.set(button, {
      '--truck-y': 0,
      '--truck-y-n': -26,
    });

    gsap.to(button, {
      '--truck-y': 1,
      '--truck-y-n': -25,
      duration: 0.2,
      delay: 1.25,
      onComplete: () => {
        // 6. Truck drives across the button road!
        const btnWidth = button.offsetWidth || 230;
        const targetX = Math.max(160, btnWidth - 72 + 25);

        gsap.timeline({
          onComplete: () => {
            button.classList.add('done');
            if (onComplete) {
              onComplete();
            }
          },
        })
          .to(truck, { x: 0, duration: 0.4 })
          .to(truck, { x: 45, duration: 0.9, ease: 'power1.inOut' })
          .to(truck, { x: 25, duration: 0.5, ease: 'power1.inOut' })
          .to(truck, { x: targetX, duration: 0.6, ease: 'power2.in' });

        // 7. Road progress bar fills along top edge in sync with the truck
        gsap.to(button, {
          '--progress': 1,
          duration: 2.4,
          ease: 'power2.in',
        });
      },
    });
  }

  /**
   * Resets the button back to the initial state (interactive toggle).
   */
  resetTruckButton(): void {
    const button = this.truckBtnEl?.nativeElement;
    if (!button) return;

    const box = (this.boxEl?.nativeElement || button.querySelector('.box')) as HTMLElement;
    const truck = (this.truckEl?.nativeElement || button.querySelector('.truck')) as HTMLElement;

    button.classList.remove('animation', 'done');
    this.isSubmitting = false;
    this.cdr.markForCheck();

    if (truck) {
      gsap.set(truck, { x: 4 });
    }
    gsap.set(button, {
      '--progress': 0,
      '--hx': 0,
      '--bx': 0,
      '--box-s': 0.5,
      '--box-o': 0,
      '--truck-y': 0,
      '--truck-y-n': -26,
    });
    if (box) {
      gsap.set(box, { x: -24, y: -6 });
    }
  }

  private executeOrderSubmission(
    onSuccess: (data: CreateOrderData) => void,
    onError: (err: any) => void
  ): void {
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
        if (item.isBundle && item.bundleMeta) {
          return item.bundleMeta.selectedProducts.map((prod) => ({
            productId: prod._id,
            variantCount: prod.variants?.[0]?.count || 60,
            quantity: item.quantity,
          }));
        }
        if (item.isOffer && item.offerMeta) {
          return [{ offerId: item.offerMeta.offerId, quantity: item.quantity }];
        }
        return [
          {
            productId: item.product._id,
            variantCount: item.selectedVariant.count,
            quantity: item.quantity,
          },
        ];
      }),
      paymentMethod,
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
        onSuccess(orderData);
      },
      error: (err) => {
        onError(err);
      },
    });
  }

  private finishOrder(orderData: CreateOrderData): void {
    const paymentMethod = this.form?.get('paymentMethod')?.value ?? 'cod';
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
        },
      });
    } else {
      setTimeout(() => {
        this.toastService.show('تم استلام طلبك بنجاح! شكراً لاختيارك فيتاتريكس.', 'success');
        this.router.navigate(['/order-success', orderData.orderNumber]);
      }, 1200);
    }
  }

  private handleSubmissionError(err: any): void {
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
    this.resetTruckButton();
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



