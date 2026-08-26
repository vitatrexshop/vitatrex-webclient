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
import { ShippingService } from '../../core/services/shipping.service';
import { ToastService } from '../../core/services/toast.service';
import { CartItem } from '../../core/models/cart.model';
import { OrderInput, PaymentMethod, CreateOrderData, GovernorateOption } from '../../core/models/order.model';
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
  private readonly shippingService = inject(ShippingService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly trackingService = inject(OrderTrackingService);
  private readonly translate = inject(TranslateService);

  form!: FormGroup;
  cartItems: CartItem[] = [];
  cartTotal = 0;
  isSubmitting = false;
  isLoadingGovernorates = true;

  governorates: GovernorateOption[] = [];

  readonly SHIPPING_THRESHOLD = 500;

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

  get orderTotal(): number {
    return this.cartTotal + this.shippingCost;
  }

  get selectedPaymentMethod(): PaymentMethod {
    return this.form?.get('paymentMethod')?.value ?? 'cod';
  }

  ngOnInit(): void {
    this.form = this.fb.group({
      name:           ['', [Validators.required, Validators.minLength(3)]],
      phone:          ['', [Validators.required, Validators.pattern(/^(01)[0-9]{9}$/)]],
      governorate:    ['', Validators.required],
      addressDetails: ['', [Validators.required, Validators.minLength(10)]],
      paymentMethod:  ['cod', Validators.required],
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
      this.cdr.markForCheck();
    });
  }

  selectPayment(method: PaymentMethod): void {
    if (method === 'card') return;
    this.form.patchValue({ paymentMethod: method });
  }

  getFieldError(field: string): string | null {
    const ctrl = this.form.get(field);
    if (!ctrl || !ctrl.invalid || !ctrl.touched) return null;
    if (ctrl.hasError('required')) {
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
    return !!(ctrl && ctrl.invalid && ctrl.touched);
  }

  submitOrder(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.isSubmitting) return;

    this.isSubmitting = true;
    this.cdr.markForCheck();

    const { name, phone, governorate, addressDetails, paymentMethod } = this.form.value;

    const payload: OrderInput = {
      customer: {
        name,
        phone,
        city: governorate, // backward compatibility
        governorate,
        address: addressDetails,
      },
      items: this.cartItems.flatMap((item) => {
        if (item.isBundle && item.bundleMeta) {
          return item.bundleMeta.selectedProducts.map((prod) => ({
            productId: prod._id,
            variantCount: prod.variants?.[0]?.count || 60,
            quantity: item.quantity,
          }));
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

        this.router.navigate(['/order-success', orderData.orderNumber]);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.cdr.markForCheck();
        const msg = err?.error?.message || 'حدث خطأ أثناء تقديم الطلب. يرجى المحاولة مرة أخرى.';
        this.toastService.show(msg, 'error');
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
