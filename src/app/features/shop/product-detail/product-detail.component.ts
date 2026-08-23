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

  product$!: Observable<Product | null>;
  selectedVariant: Variant | null = null;
  quantity = 1;
  selectedImage: string | null = null;
  isDescriptionOpen = true;

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
    // Reactively fetch product whenever route slug param changes
    this.product$ = this.route.paramMap.pipe(
      map(params => params.get('slug') ?? ''),
      switchMap((slug) => {
        if (!slug) return of(null);
        this.selectedImage = null; // reset thumbnail selection
        return this.productService.getProductBySlug(slug).pipe(
          tap((prod) => {
            if (prod && prod.variants?.length) {
              this.selectedVariant = prod.variants[0];
              this.quantity = 1;
            }
            if (prod) {
              this.selectedImage = prod.image || (prod.images && prod.images[0]) || null;
            }
            // Load suggested products (all except current)
            this.loadSuggestions(prod?._id);
          }),
          catchError(() => {
            this.toastService.show('عذراً، لم يتم العثور على المنتج المطلوب ⚠️', 'error');
            this.router.navigate(['/shop']);
            return of(null);
          })
        );
      })
    );
  }

  /** Fetch all products, exclude the current one, take up to 4 as suggestions */
  private loadSuggestions(currentId?: string): void {
    this.productService.getProducts().pipe(
      catchError(() => of([])),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((products) => {
      this.suggestedProducts = products
        .filter(p => p._id !== currentId && p.isActive !== false)
        .slice(0, 4);
      this.cdr.markForCheck();
    });
  }

  toggleDescription(): void {
    this.isDescriptionOpen = !this.isDescriptionOpen;
  }

  selectVariant(variant: Variant): void {
    this.selectedVariant = variant;
  }

  selectImage(imgUrl: string): void {
    this.selectedImage = imgUrl;
  }

  getImageUrl(product: Product): string {
    return this.selectedImage || product.image || (product.images && product.images[0]) || 'assets/images/hero-fallback.webp';
  }

  /** Generate thumbnails array ensuring at least 4 thumbnails exist for the vertical strip */
  getThumbnails(product: Product): string[] {
    const list: string[] = [];
    if (product.image) list.push(product.image);
    if (product.images?.length) {
      product.images.forEach(img => {
        if (!list.includes(img)) list.push(img);
      });
    }
    // If fewer than 4 images, repeat/pad gracefully
    if (list.length === 0) list.push('assets/images/hero-fallback.webp');
    const result = [...list];
    while (result.length < 4 && list.length > 0) {
      result.push(list[result.length % list.length]);
    }
    return result.slice(0, 4);
  }

  /** Generate colorful category & health pills matching the 360 Nutrition style */
  getPills(product: Product): HealthPill[] {
    const pills: HealthPill[] = [];
    const catName = this.getCategoryName(product).toLowerCase();

    // Defaults & dynamic mapping
    if (catName.includes('مناعة') || catName.includes('immun')) {
      pills.push({ label: 'المناعة والوقاية', emoji: '💧', colorClass: 'pill--blue' });
      pills.push({ label: 'العناية اليومية', emoji: '🧃', colorClass: 'pill--green' });
    } else if (catName.includes('أطفال') || catName.includes('kid')) {
      pills.push({ label: 'صحة الأطفال والنمو', emoji: '👶', colorClass: 'pill--orange' });
      pills.push({ label: 'العناية اليومية', emoji: '🧃', colorClass: 'pill--green' });
    } else if (catName.includes('نوم') || catName.includes('sleep')) {
      pills.push({ label: 'نوم واسترخاء عميق', emoji: '🌙', colorClass: 'pill--purple' });
      pills.push({ label: 'صحة الجهاز العصبي', emoji: '✨', colorClass: 'pill--pink' });
    } else {
      pills.push({ label: 'العناية اليومية', emoji: '🧃', colorClass: 'pill--green' });
      pills.push({ label: 'دعم المناعة', emoji: '💧', colorClass: 'pill--blue' });
    }

    // Add general health tags
    pills.push({ label: 'حيوية ونشاط', emoji: '🧓', colorClass: 'pill--amber' });
    pills.push({ label: 'صحة الرجال', emoji: '🧔', colorClass: 'pill--teal' });
    pills.push({ label: 'صحة السيدات', emoji: '👩', colorClass: 'pill--pink' });

    return pills;
  }

  /** Headline for description banner */
  getHeadline(product: Product): string {
    const name = product.name?.toLowerCase() || '';
    if (name.includes('d3') || name.includes('sun') || name.includes('شمس')) {
      return 'YOUR DAILY DOSE OF SUNSHINE 🌞';
    }
    if (name.includes('iron') || name.includes('حديد')) {
      return 'YOUR DAILY DOSE OF STRENGTH & ENERGY ⚡';
    }
    if (name.includes('vision') || name.includes('عين')) {
      return 'YOUR DAILY SHIELD FOR BRIGHT VISION 👁️';
    }
    if (name.includes('sleep') || name.includes('نوم')) {
      return 'YOUR TICKET TO DEEP & RESTFUL SLEEP 🌙';
    }
    return 'YOUR DAILY DOSE OF HEALTH & VITALITY ✨';
  }

  getCategoryName(product: Product): string {
    if (!product?.category) return 'الفيتامينات والمكملات 🌿';
    if (typeof product.category === 'object' && product.category.name) {
      return product.category.name;
    }
    const cat = String(product.category).toLowerCase();
    if (cat.includes('immunity')) return 'المناعة والوقاية 🛡️';
    if (cat.includes('kids')) return 'الأطفال 👶';
    if (cat.includes('energy')) return 'طاقة وتركيز ⚡';
    if (cat.includes('sleep')) return 'نوم واسترخاء 😴';
    return String(product.category) || 'الفيتامينات والمكملات 🌿';
  }

  increment(): void {
    this.quantity++;
  }

  decrement(): void {
    if (this.quantity > 1) {
      this.quantity--;
    }
  }

  addToCart(product: Product): void {
    if (!this.selectedVariant) return;
    this.cartService.addToCart(product, this.selectedVariant, this.quantity);
    this.toastService.show(`تمت إضافة ${product.name} إلى السلة ✅`, 'success');
    this.cartDrawerService.open();
  }

  buyNow(product: Product): void {
    if (!this.selectedVariant) return;
    this.cartService.addToCart(product, this.selectedVariant, this.quantity);
    this.router.navigate(['/checkout']);
  }

  addSuggestedToCart(product: Product): void {
    const variant = product.variants?.[0];
    if (!variant) return;
    this.cartService.addToCart(product, variant, 1);
    this.toastService.show(`تمت إضافة ${product.name} إلى السلة ✅`, 'success');
    this.cartDrawerService.open();
  }

  getMinPrice(product: Product): number {
    if (!product.variants?.length) return 0;
    return Math.min(...product.variants.map(v => v.price));
  }

  getOriginalPrice(product: Product): number | null {
    const variant = product.variants?.[0];
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

