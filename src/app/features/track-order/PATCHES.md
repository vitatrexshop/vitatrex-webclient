# Integration Patches for vitatrix-webclient (Angular 16)

Copy the four component files to:
`src/app/features/track-order/`

Then apply the four patches below to existing project files.

---

## FILE 1 — `src/app/core/models/order.model.ts`

Add these interfaces **before** the closing of the file (after the existing `OrderListResponse` line):

```typescript
// ── Magic Link Tracking ───────────────────────────────────────────────────────

/** Shape of data.data returned by POST /api/v1/orders after the tracking update */
export interface CreateOrderData {
  orderNumber:   string;
  orderStatus:   OrderStatus;
  paymentMethod: PaymentMethod;
  totalAmount:   number;
  /** One-time magic link — contains raw token. Save it to localStorage immediately. */
  trackingUrl:   string;
}

export interface TrackingItem {
  name:     string;
  quantity: number;
}

/** Sanitized order data returned by GET /api/v1/orders/track — no PII */
export interface TrackingData {
  orderNumber:        string;
  orderStatus:        OrderStatus;
  createdAt:          string;
  estimatedDelivery:  string | null;
  items:              TrackingItem[];
}

export type CreateOrderResponse = ApiResponse<CreateOrderData>;
export type TrackingResponse    = ApiResponse<TrackingData>;
```

---

## FILE 2 — `src/app/core/services/order.service.ts`

### 2a. Update the import to include `CreateOrderData`:
```typescript
import { Order, OrderInput, CreateOrderData } from '../models/order.model';
```

### 2b. Change `submitGuestOrder` return type from `Observable<Order>` to `Observable<CreateOrderData>`:
```typescript
submitGuestOrder(payload: OrderInput): Observable<CreateOrderData> {
  return this.api.post<CreateOrderData>(ORDERS_API, payload).pipe(
    map((res) => res.data as CreateOrderData)
  );
}
```

> ⚠️ The backend now returns a slim `CreateOrderData` object (with `trackingUrl`) instead of the full Order document. The Order Success page fetches the full order separately by `orderNumber`, so no other changes to that page are needed.

---

## FILE 3 — `src/app/features/checkout/checkout.component.ts`

### 3a. Add imports at the top:
```typescript
import { OrderTrackingService } from '../track-order/order-tracking.service';
import { CreateOrderData } from '../../core/models/order.model';
```

### 3b. Add `OrderTrackingService` to the constructor:
```typescript
constructor(
  private readonly fb:              FormBuilder,
  private readonly cartService:     CartService,
  private readonly orderService:    OrderService,
  private readonly toastService:    ToastService,
  private readonly router:          Router,
  private readonly cdr:             ChangeDetectorRef,
  private readonly trackingService: OrderTrackingService,   // ← ADD THIS
) {}
```

### 3c. Replace the `submitOrder()` success handler:

**Before:**
```typescript
next: (order) => {
  this.cartService.clearCart();
  this.router.navigate(['/order-success', order.orderNumber]);
},
```

**After:**
```typescript
next: (orderData: CreateOrderData) => {
  this.cartService.clearCart();

  // Extract and persist the magic link token for same-device re-access
  try {
    const url   = new URL(orderData.trackingUrl);
    const token = url.searchParams.get('token') ?? '';
    if (token) {
      this.trackingService.saveToStorage(orderData.orderNumber, token);
    }
  } catch { /* malformed URL — skip storage */ }

  // Navigate to the existing order success page (unchanged UX)
  this.router.navigate(['/order-success', orderData.orderNumber]);
},
```

---

## FILE 4 — `src/app/app-routing.module.ts`

Add the `/track` lazy route **before** the catch-all `{ path: '**', redirectTo: '' }`:

```typescript
{
  path: 'track',
  loadChildren: () =>
    import('./features/track-order/track-order.module').then(
      (m) => m.TrackOrderModule
    ),
},
```

Final routes array should look like:
```typescript
const routes: Routes = [
  { path: '',          loadChildren: () => import('./features/home/home.module').then((m) => m.HomeModule) },
  { path: 'shop',      loadChildren: () => import('./features/shop/shop.module').then((m) => m.ShopModule) },
  { path: 'quiz',      loadChildren: () => import('./features/quiz/quiz.module').then((m) => m.QuizModule) },
  { path: 'checkout',  loadChildren: () => import('./features/checkout/checkout.module').then((m) => m.CheckoutModule) },
  { path: 'order-success', loadChildren: () => import('./features/order-success/order-success.module').then((m) => m.OrderSuccessModule) },
  { path: 'track',     loadChildren: () => import('./features/track-order/track-order.module').then((m) => m.TrackOrderModule) },
  { path: '**', redirectTo: '' },
];
```

> **Remove** the existing `track-order` route (if present) that incorrectly points to `OrderSuccessModule`.

---

## Final Verification

After copying and patching, run:
```bash
cd D:\vitatrix_webclient
ng serve
```

Test the following URLs:
1. `http://localhost:4200/track?id=VT-XXXXX&token=<64-hex>` — should show tracking card
2. `http://localhost:4200/track?id=VT-XXXXX&token=wrong` — should show Arabic 401 error
3. `http://localhost:4200/track` (no params) — should fall back to localStorage, then show error
4. Post a new order via checkout — should see `trackingUrl` in the network response
