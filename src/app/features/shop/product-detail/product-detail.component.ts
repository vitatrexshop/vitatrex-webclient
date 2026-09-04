import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ProductService } from '../../../core/services/product.service';
import { CartService } from '../../../core/services/cart.service';
import { CartDrawerService } from '../../../core/services/cart-drawer.service';
import { ToastService } from '../../../core/services/toast.service';
import { Product, Variant } from '../../../core/models/product.model';

export interface HealthPill {
  label: string;
  emoji: string;
  colorClass: string;
}

@Component({
  selector: 'app-product-detail',
  templateUrl: './product-detail.component.html',
  styleUrls: ['./product-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductDetailComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  product: Product | null = null;
  product$!: Observable<Product | null>;
  isLoading = true;
  isNotFound = false;

  selectedVariant: Variant | null = null;
  quantity = 1;
  selectedImage: string | null = null;
  isDescriptionOpen = false;
  isAdding = false;

  /** Other products to suggest — populated after main product loads */
  suggestedProducts: Product[] = [];

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly productService: ProductService,
    private readonly cartService: CartService,
    private readonly cartDrawerService: CartDrawerService,
    private readonly toastService: ToastService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Reactively fetch product whenever route slug param changes (handles direct reload + in-app routing)
    this.product$ = this.route.paramMap.pipe(
      map(params => params.get('slug') || this.route.snapshot.paramMap.get('slug') || ''),
      switchMap((slug) => {
        const cleanSlug = (slug || '').trim();
        if (!cleanSlug) {
          this.isLoading = false;
          this.isNotFound = true;
          this.product = null;
          this.cdr.markForCheck();
          return of(null);
        }

        this.isLoading = true;
        this.isNotFound = false;
        this.selectedImage = null; // reset thumbnail selection
        this.cdr.markForCheck();

        return this.productService.getProductBySlug(cleanSlug).pipe(
          tap((prod) => {
            this.isLoading = false;
            this.isNotFound = !prod;
            this.product = prod || null;

            if (prod && prod.variants?.length) {
              this.selectedVariant = prod.variants[0];
              this.quantity = 1;
            } else if (prod) {
              // Safe fallback for products with price at root
              this.selectedVariant = {
                count: 60,
                price: (prod as any).price || 0,
                originalPrice: (prod as any).originalPrice || null,
                discountPercentage: (prod as any).discountPercentage || 0,
                stock: (prod as any).stock ?? -1,
              };
              this.quantity = 1;
            } else {
              this.selectedVariant = null;
            }

            if (prod) {
              this.selectedImage = prod.image || (prod.images && prod.images[0]) || null;
            }

            // Load suggested products (all except current)
            this.loadSuggestions(prod?._id);
            this.cdr.markForCheck();
          }),
          catchError((err) => {
            console.warn('Product not found or failed to load:', err);
            this.isLoading = false;
            this.isNotFound = true;
            this.product = null;
            this.cdr.markForCheck();
            return of(null);
          })
        );
      })
    );

    // Subscribe to update component state synchronously as well
    this.product$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  /** Fetch all products, exclude the current one, take up to 4 as suggestions */
  private loadSuggestions(currentId?: string): void {
    this.productService.getProducts().pipe(
      catchError(() => of([])),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((products) => {
      this.suggestedProducts = (products || [])
        .filter(p => p && p._id !== currentId && p.isActive !== false)
        .slice(0, 4);
      this.cdr.markForCheck();
    });
  }

  toggleDescription(): void {
    this.isDescriptionOpen = !this.isDescriptionOpen;
    this.cdr.markForCheck();
  }

  selectVariant(variant: Variant): void {
    this.selectedVariant = variant;
    this.quantity = 1;
    this.cdr.markForCheck();
  }

  selectImage(imgUrl: string): void {
    this.selectedImage = imgUrl;
    this.cdr.markForCheck();
  }

  getImageUrl(product?: Product | null): string {
    if (!product) return 'assets/images/hero-fallback.webp';
    return this.selectedImage || product.image || (product.images && product.images[0]) || 'assets/images/hero-fallback.webp';
  }

  /** Generate clean thumbnails array with ONLY unique images (never force duplicate) */
  getThumbnails(product?: Product | null): string[] {
    if (!product) return [];
    const list: string[] = [];
    if (product.image) list.push(product.image);
    if (Array.isArray(product.images) && product.images.length) {
      product.images.forEach(img => {
        if (img && !list.includes(img)) list.push(img);
      });
    }
    return list;
  }

  /** Generate colorful category & health pills matching the 360 Nutrition style */
  getPills(product?: Product | null): HealthPill[] {
    if (!product) return [];
    const pills: HealthPill[] = [];
    const catName = this.getCategoryName(product).toLowerCase();

    if (catName.includes('مناعة') || catName.includes('immun')) {
      pills.push({ label: 'المناعة والوقاية', emoji: '', colorClass: 'pill--blue' });
      pills.push({ label: 'العناية اليومية', emoji: '', colorClass: 'pill--green' });
    } else if (catName.includes('أطفال') || catName.includes('kid')) {
      pills.push({ label: 'صحة الأطفال والنمو', emoji: '', colorClass: 'pill--orange' });
      pills.push({ label: 'العناية اليومية', emoji: '', colorClass: 'pill--green' });
    } else if (catName.includes('نوم') || catName.includes('sleep')) {
      pills.push({ label: 'نوم واسترخاء عميق', emoji: '', colorClass: 'pill--purple' });
      pills.push({ label: 'صحة الجهاز العصبي', emoji: '', colorClass: 'pill--pink' });
    } else {
      pills.push({ label: 'العناية اليومية', emoji: '', colorClass: 'pill--green' });
      pills.push({ label: 'دعم المناعة', emoji: '', colorClass: 'pill--blue' });
    }

    pills.push({ label: 'طبيعي 100%', emoji: '', colorClass: 'pill--teal' });
    return pills;
  }

  /** Headline for description banner */
  getHeadline(product?: Product | null): string {
    if (!product) return 'YOUR DAILY DOSE OF HEALTH & VITALITY';
    const name = product.name?.toLowerCase() || '';
    if (name.includes('d3') || name.includes('sun') || name.includes('شمس')) {
      return 'YOUR DAILY DOSE OF SUNSHINE';
    }
    if (name.includes('iron') || name.includes('حديد')) {
      return 'YOUR DAILY DOSE OF STRENGTH & ENERGY';
    }
    if (name.includes('vision') || name.includes('عين')) {
      return 'YOUR DAILY SHIELD FOR BRIGHT VISION';
    }
    if (name.includes('sleep') || name.includes('نوم')) {
      return 'YOUR TICKET TO DEEP & RESTFUL SLEEP';
    }
    return 'YOUR DAILY DOSE OF HEALTH & VITALITY';
  }

  getCategoryName(product?: Product | null): string {
    if (!product?.category) return 'الفيتامينات والمكملات';
    if (typeof product.category === 'object' && product.category.name) {
      return product.category.name;
    }
    const cat = String(product.category).toLowerCase();
    if (cat.includes('immunity')) return 'المناعة والوقاية';
    if (cat.includes('kids')) return 'الأطفال';
    if (cat.includes('energy')) return 'طاقة وتركيز';
    if (cat.includes('sleep')) return 'نوم واسترخاء';
    return String(product.category) || 'الفيتامينات والمكملات';
  }

  /** Max purchasable qty: -1 = unlimited, otherwise capped at variant stock */
  get maxStock(): number {
    if (!this.selectedVariant || this.selectedVariant.stock === -1) return 999;
    return Math.max(0, this.selectedVariant.stock);
  }

  /** True when selected variant is completely out of stock */
  get isOutOfStock(): boolean {
    if (!this.selectedVariant) return false;
    return this.selectedVariant.stock !== -1 && this.selectedVariant.stock <= 0;
  }

  /** True when 1-5 units remain (show low-stock warning badge) */
  get isLowStock(): boolean {
    if (!this.selectedVariant) return false;
    const s = this.selectedVariant.stock;
    return s !== -1 && s > 0 && s <= 5;
  }

  increment(): void {
    if (this.quantity < this.maxStock) {
      this.quantity++;
      this.cdr.markForCheck();
    }
  }

  decrement(): void {
    if (this.quantity > 1) {
      this.quantity--;
      this.cdr.markForCheck();
    }
  }

  addToCart(product?: Product | null): void {
    if (!product || !this.selectedVariant || this.isOutOfStock) return;
    this.isAdding = true;
    this.cdr.markForCheck();

    const safeQty = Math.min(this.quantity, this.maxStock);
    this.cartService.addToCart(product, this.selectedVariant, safeQty);
    this.toastService.show(`تمت إضافة ${product.name} إلى السلة`, 'success');
    this.cartDrawerService.open();

    setTimeout(() => {
      this.isAdding = false;
      this.cdr.markForCheck();
    }, 600);
  }

  buyNow(product?: Product | null): void {
    if (!product || !this.selectedVariant || this.isOutOfStock) return;
    const safeQty = Math.min(this.quantity, this.maxStock);
    this.cartService.addToCart(product, this.selectedVariant, safeQty);
    this.router.navigate(['/checkout']);
  }

  addSuggestedToCart(product: Product): void {
    if (!product) return;
    const variant = product.variants?.[0];
    if (!variant || (variant.stock !== -1 && variant.stock <= 0)) {
      this.toastService.show('هذا المنتج غير متوفر حالياً بالمخزون', 'warning');
      return;
    }
    this.cartService.addToCart(product, variant, 1);
    this.toastService.show(`تمت إضافة ${product.name} إلى السلة`, 'success');
    this.cartDrawerService.open();
    this.cdr.markForCheck();
  }

  getMinPrice(product?: Product | null): number {
    if (!product?.variants?.length) return 0;
    const prices = product.variants.map(v => v.price).filter(p => typeof p === 'number' && !isNaN(p));
    return prices.length ? Math.min(...prices) : 0;
  }

  getOriginalPrice(product?: Product | null): number | null {
    if (!product?.variants?.length) return null;
    const variant = product.variants[0];
    if (variant?.originalPrice && variant.originalPrice > variant.price) {
      return variant.originalPrice;
    }
    return null;
  }

  trackByVariant(_: number, item: Variant): number {
    return item.count;
  }

  trackById(_: number, p: Product): string {
    return p._id;
  }
}
