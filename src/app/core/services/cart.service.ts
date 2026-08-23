import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, distinctUntilChanged } from 'rxjs/operators';
import { CartItem, BundleCartMeta } from '../models/cart.model';
import { Product, Variant } from '../models/product.model';

const CART_STORAGE_KEY = 'vitatrix_cart';

/**
 * Client-side shopping cart backed by a BehaviorSubject.
 * Supports both standalone product variants and unified customizable 3-slot bundles.
 * State is persisted to localStorage on every mutation so it survives page refreshes.
 */
@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly _items$ = new BehaviorSubject<CartItem[]>(
    this.loadFromStorage()
  );

  /** Raw list of cart items */
  readonly cartItems$: Observable<CartItem[]> = this._items$.asObservable();

  /** Total number of individual units (or bundles) in the cart */
  readonly itemCount$: Observable<number> = this._items$.pipe(
    map((items) => items.reduce((sum, i) => sum + i.quantity, 0)),
    distinctUntilChanged()
  );

  /** Sum of all line totals (variant.price x quantity) */
  readonly cartTotal$: Observable<number> = this._items$.pipe(
    map((items) => items.reduce((sum, i) => sum + i.itemTotal, 0)),
    distinctUntilChanged()
  );

  /**
   * Total savings = sum of (originalPrice - price) x quantity for items
   * where an originalPrice exists.
   */
  readonly discountSavings$: Observable<number> = this._items$.pipe(
    map((items) =>
      items.reduce((savings, item) => {
        const original = item.selectedVariant.originalPrice;
        if (original && original > item.selectedVariant.price) {
          return savings + (original - item.selectedVariant.price) * item.quantity;
        }
        return savings;
      }, 0)
    ),
    distinctUntilChanged()
  );

  // ─────────────────────────────────────────────
  // Mutations
  // ─────────────────────────────────────────────

  /**
   * Add a standard product+variant to the cart.
   */
  addToCart(product: Product, variant: Variant, quantity = 1): void {
    const current = this._items$.value;
    const existingIndex = current.findIndex(
      (i) => !i.isBundle && i.product._id === product._id && i.selectedVariant.count === variant.count
    );

    let updated: CartItem[];
    if (existingIndex > -1) {
      updated = current.map((item, idx) => {
        if (idx !== existingIndex) return item;
        const newQty = item.quantity + quantity;
        return { ...item, quantity: newQty, itemTotal: variant.price * newQty };
      });
    } else {
      const newItem: CartItem = {
        product,
        selectedVariant: variant,
        quantity,
        itemTotal: variant.price * quantity,
        isBundle: false,
      };
      updated = [...current, newItem];
    }

    this.publish(updated);
  }

  /**
   * Add an entire unified Bundle (3 user-chosen products) as a single cart line.
   * @param bundle  The bundle object from the API
   * @param selectedProducts  Exactly 3 products chosen by the client
   * @param quantity  Number of bundles to add (default 1)
   */
  addBundleToCart(bundle: any, selectedProducts: Product[], quantity = 1): void {
    const bundleId = bundle.id || bundle._id || 'bundle';
    const bundlePrice = bundle.discountedPrice ?? bundle.bundlePrice ?? 0;
    const originalPrice = bundle.originalPrice ?? bundlePrice;
    const discountPct = bundle.discountPercentage ?? 0;

    // Build human-readable included summary
    const includedNames = selectedProducts.map((p) => p.name);
    const includedSummary = includedNames.join(' + ');

    // Unique synthetic ID based on bundle + sorted selected product IDs
    const sortedIds = [...selectedProducts.map((p) => p._id)].sort().join('_');
    const syntheticId = `bundle_${bundleId}_${sortedIds}`;

    const bundleMeta: BundleCartMeta = {
      bundleId,
      bundleTitle: bundle.title || 'باقة اصنع باقتك',
      bundleImage: bundle.image || selectedProducts[0]?.image || '',
      bundlePrice,
      originalPrice,
      discountPercentage: discountPct,
      selectedProducts,
      includedSummary,
      includedItems: includedNames,
    };

    const syntheticProduct: Product = {
      _id: syntheticId,
      name: bundle.title || 'باقة اصنع باقتك',
      slug: bundle.slug || `bundle-${bundleId}`,
      category: 'bundle',
      description: bundle.description || includedSummary,
      benefits: ['باقة 3 منتجات', 'شحن مجاني'],
      isBestSeller: true,
      isFeatured: true,
      image: bundle.image || selectedProducts[0]?.image || '',
      isActive: true,
      variants: [
        {
          _id: `v_${syntheticId}`,
          count: 3,
          price: bundlePrice,
          originalPrice: originalPrice > bundlePrice ? originalPrice : null,
          discountPercentage: discountPct,
          stock: 99,
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const variant = syntheticProduct.variants[0];

    const current = this._items$.value;
    const existingIndex = current.findIndex((i) => i.product._id === syntheticId);

    let updated: CartItem[];
    if (existingIndex > -1) {
      updated = current.map((item, idx) => {
        if (idx !== existingIndex) return item;
        const newQty = item.quantity + quantity;
        return { ...item, quantity: newQty, itemTotal: bundlePrice * newQty };
      });
    } else {
      const newItem: CartItem = {
        product: syntheticProduct,
        selectedVariant: variant,
        quantity,
        itemTotal: bundlePrice * quantity,
        isBundle: true,
        bundleMeta,
      };
      updated = [...current, newItem];
    }

    this.publish(updated);
  }

  /**
   * Remove a specific product or bundle from the cart.
   */
  removeFromCart(productId: string, variantCount: number): void {
    const updated = this._items$.value.filter(
      (i) => !(i.product._id === productId && i.selectedVariant.count === variantCount)
    );
    this.publish(updated);
  }

  /**
   * Set an explicit quantity for a cart line.
   * Passing qty <= 0 removes the item entirely.
   */
  updateQuantity(productId: string, variantCount: number, qty: number): void {
    if (qty <= 0) {
      this.removeFromCart(productId, variantCount);
      return;
    }
    const updated = this._items$.value.map((item) => {
      if (item.product._id !== productId || item.selectedVariant.count !== variantCount) {
        return item;
      }
      return { ...item, quantity: qty, itemTotal: item.selectedVariant.price * qty };
    });
    this.publish(updated);
  }

  /** Empty the cart and clear localStorage */
  clearCart(): void {
    this.publish([]);
  }

  /** Synchronous snapshot for use in guards */
  get snapshot(): CartItem[] {
    return this._items$.value;
  }

  // ─────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────

  private publish(items: CartItem[]): void {
    this._items$.next(items);
    this.persistToStorage(items);
  }

  private loadFromStorage(): CartItem[] {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as CartItem[]) : [];
    } catch {
      return [];
    }
  }

  private persistToStorage(items: CartItem[]): void {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Storage quota exceeded or private browsing — fail silently
    }
  }
}
