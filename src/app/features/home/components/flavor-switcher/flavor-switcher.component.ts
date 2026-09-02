import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ElementRef,
  ViewChild,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Inject,
  NgZone,
  PLATFORM_ID
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { gsap } from 'gsap';
import { ProductService } from '../../../../core/services/product.service';
import { Product, Variant } from '../../../../core/models/product.model';
import { CartService } from '../../../../core/services/cart.service';
import { CartDrawerService } from '../../../../core/services/cart-drawer.service';
import { ToastService } from '../../../../core/services/toast.service';
import { FlyToCartService } from '../../../../core/services/fly-to-cart.service';

@Component({
  selector: 'app-flavor-switcher',
  templateUrl: './flavor-switcher.component.html',
  styleUrls: ['./flavor-switcher.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlavorSwitcherComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('stage', { static: false }) stageEl!: ElementRef<HTMLDivElement>;
  @ViewChild('jar', { static: false }) jarEl!: ElementRef<HTMLDivElement>;

  products: Product[] = [];
  activeProduct: Product | null = null;
  activeVariant: Variant | null = null;
  
  private floatTween: gsap.core.Tween | null = null;
  private cachedJarRect: DOMRect | null = null;
  private tiltRafId: number | null = null;
  private cleanupTiltListeners?: () => void;

  constructor(
    private readonly productService: ProductService,
    private readonly cartService: CartService,
    private readonly cartDrawerService: CartDrawerService,
    private readonly toastService: ToastService,
    private readonly flyToCartService: FlyToCartService,
    private readonly cdr: ChangeDetectorRef,
    private readonly ngZone: NgZone,
    @Inject(PLATFORM_ID) private readonly platformId: object
  ) {}

  ngOnInit(): void {
    // Fetch products
    this.productService.getProducts().pipe(
      catchError(() => of([]))
    ).subscribe((res) => {
      this.products = res.filter(p => p.isActive !== false);
      if (this.products.length > 0) {
        this.activeProduct = this.products[0];
        if (this.activeProduct.variants?.length) {
          this.activeVariant = this.activeProduct.variants[0];
        }
      }
      this.cdr.markForCheck();
    });
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.initFloatAnimation();
      this.setupTiltEffect();
    }
  }

  ngOnDestroy(): void {
    this.killAnimations();
    this.cleanupTiltListeners?.();
    if (this.tiltRafId !== null) {
      cancelAnimationFrame(this.tiltRafId);
    }
  }

  setActive(prod: Product): void {
    this.activeProduct = prod;
    if (prod.variants?.length) {
      this.activeVariant = prod.variants[0];
    }
    this.cachedJarRect = null;
    this.cdr.markForCheck();

    // Re-trigger visual jar floating scale transition outside Angular zone
    if (isPlatformBrowser(this.platformId) && this.jarEl) {
      this.ngZone.runOutsideAngular(() => {
        gsap.fromTo(this.jarEl.nativeElement,
          { scale: 0.88, opacity: 0.7 },
          { scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(1.4)' }
        );
      });
    }
  }

  private initFloatAnimation(): void {
    if (!isPlatformBrowser(this.platformId) || !this.jarEl) return;
    
    // Subtle luxury floating yoyo loop run outside Angular
    this.ngZone.runOutsideAngular(() => {
      this.floatTween = gsap.to(this.jarEl.nativeElement, {
        y: -10,
        repeat: -1,
        yoyo: true,
        duration: 2.4,
        ease: 'sine.inOut',
      });
    });
  }

  /**
   * High-Performance 3D Perspective Tilt Effect
   * - Runs entirely outside Angular zone (zero change detection cycles)
   * - Batches DOM read (cached on pointerenter)
   * - Batches DOM writes inside requestAnimationFrame
   * - Eliminates layout thrashing and forced reflows
   */
  private setupTiltEffect(): void {
    if (!isPlatformBrowser(this.platformId) || !this.jarEl?.nativeElement) return;
    const jar = this.jarEl.nativeElement;

    this.ngZone.runOutsideAngular(() => {
      const onEnter = () => {
        // Read phase: cached once on interaction start
        this.cachedJarRect = jar.getBoundingClientRect();
      };

      const onMove = (event: PointerEvent) => {
        if (!this.cachedJarRect) {
          this.cachedJarRect = jar.getBoundingClientRect();
        }
        const rect = this.cachedJarRect;
        const x = event.clientX - rect.left - rect.width / 2;
        const y = event.clientY - rect.top - rect.height / 2;

        const rotateY = (x / (rect.width / 2)) * 12;
        const rotateX = -(y / (rect.height / 2)) * 12;

        if (this.tiltRafId !== null) {
          cancelAnimationFrame(this.tiltRafId);
        }

        // Write phase: scheduled in next paint frame
        this.tiltRafId = requestAnimationFrame(() => {
          gsap.to(jar, {
            transform: `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.04, 1.04, 1.04)`,
            duration: 0.3,
            ease: 'power1.out',
            overwrite: 'auto',
          });
          this.tiltRafId = null;
        });
      };

      const onLeave = () => {
        this.cachedJarRect = null;
        if (this.tiltRafId !== null) {
          cancelAnimationFrame(this.tiltRafId);
          this.tiltRafId = null;
        }
        gsap.to(jar, {
          transform: 'perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
          duration: 0.4,
          ease: 'power2.out',
          overwrite: 'auto',
        });
      };

      jar.addEventListener('pointerenter', onEnter, { passive: true });
      jar.addEventListener('pointermove', onMove, { passive: true });
      jar.addEventListener('pointerleave', onLeave, { passive: true });

      this.cleanupTiltListeners = () => {
        jar.removeEventListener('pointerenter', onEnter);
        jar.removeEventListener('pointermove', onMove);
        jar.removeEventListener('pointerleave', onLeave);
      };
    });
  }

  addToCart(event: MouseEvent): void {
    if (!this.activeProduct || !this.activeVariant) return;
    this.cartService.addToCart(this.activeProduct, this.activeVariant, 1);
    this.flyToCartService.fly(event, this.getEmoji());
    this.toastService.show(`تمت إضافة ${this.activeProduct.name} للسلة ✅`, 'success');
    this.cartDrawerService.open();
  }

  private getEmoji(): string {
    if (!this.activeProduct) return '🍓';
    const text = (this.activeProduct.name + ' ' + (this.activeProduct.category || '')).toLowerCase();
    if (text.includes('kids') || text.includes('طفل') || text.includes('أطفال')) return '👶';
    if (text.includes('immune') || text.includes('مناعة')) return '🛡️';
    return '🍓';
  }

  private killAnimations(): void {
    if (this.floatTween) {
      this.floatTween.kill();
      this.floatTween = null;
    }
  }
}
