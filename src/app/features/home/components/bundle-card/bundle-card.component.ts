import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  Inject,
  inject,
  OnInit,
  PLATFORM_ID,
  ViewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { BundleService } from '../../../../core/services/bundle.service';
import { CartService } from '../../../../core/services/cart.service';
import { CartDrawerService } from '../../../../core/services/cart-drawer.service';
import { Bundle } from '../../../../core/models/bundle.model';
import { Product } from '../../../../core/models/product.model';
import { environment } from '../../../../../environments/environment';

/** Labels for each slot index */
const SLOT_LABELS = ['اختر منتجك الأول', 'اختر منتجك الثاني', 'اختر منتجك الثالث'];
const SLOT_ARIA  = ['اختر المنتج الأول', 'اختر المنتج الثاني', 'اختر المنتج الثالث'];

@Component({
  selector: 'app-bundle-card',
  templateUrl: './bundle-card.component.html',
  styleUrls: ['./bundle-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BundleCardComponent implements OnInit {
  @ViewChild('modalBackdrop') modalBackdrop?: ElementRef<HTMLElement>;

  private readonly destroyRef    = inject(DestroyRef);
  private readonly cdr           = inject(ChangeDetectorRef);
  private readonly bundleService = inject(BundleService);
  private readonly cartService   = inject(CartService);
  private readonly cartDrawer    = inject(CartDrawerService);
  private readonly isBrowser: boolean;

  isLoading = true;
  bundles: Bundle[] = [];

  /** Slot labels exposed to template */
  readonly slotLabels = SLOT_LABELS;
  readonly slotAria   = SLOT_ARIA;

  // ── Per-bundle state maps ──────────────────────────────────────────────────
  /** bundleId → [slot0Product, slot1Product, slot2Product]  (null = not yet chosen) */
  selectedSlots  = new Map<string, (Product | null)[]>();
  /** bundleId → which slot index the modal is currently editing */
  activeSlotIdx  = new Map<string, number>();
  /** bundleId → modal open flag */
  showModal      = new Map<string, boolean>();
  /** bundleId → adding-to-cart animation flag */
  isAdding       = new Map<string, boolean>();
  /** bundleId → per-slot checkmark animation flags */
  checkAnim      = new Map<string, boolean[]>();

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    this.fetchBundles();
  }

  private fetchBundles(): void {
    this.bundleService
      .getBundles()
      .pipe(catchError(() => of([])), takeUntilDestroyed(this.destroyRef))
      .subscribe((bundles) => {
        // Only show bundles with at least 3 allowed products
        this.bundles = (bundles ?? []).filter(
          (b) =>
            b.allowedProducts?.length >= 3 &&
            b.allowedProducts.some((p) => typeof p === 'object')
        );
        // Initialise slot state for each bundle
        this.bundles.forEach((b) => {
          if (!this.selectedSlots.has(b._id)) {
            this.selectedSlots.set(b._id, [null, null, null]);
            this.checkAnim.set(b._id, [false, false, false]);
          }
        });
        this.isLoading = false;
        this.cdr.markForCheck();
      });
  }

  // ─── Modal Control ────────────────────────────────────────────────────────

  openModalForSlot(bundleId: string, slotIdx: number): void {
    this.activeSlotIdx.set(bundleId, slotIdx);
    this.showModal.set(bundleId, true);
    if (this.isBrowser) document.body.style.overflow = 'hidden';
    this.cdr.markForCheck();
  }

  closeModal(bundleId: string): void {
    this.showModal.set(bundleId, false);
    if (this.isBrowser) document.body.style.overflow = '';
    this.cdr.markForCheck();
  }

  isModalOpen(bundleId: string): boolean {
    return this.showModal.get(bundleId) ?? false;
  }

  getActiveSlotIdx(bundleId: string): number {
    return this.activeSlotIdx.get(bundleId) ?? 0;
  }

  getActiveSlotLabel(bundleId: string): string {
    return SLOT_LABELS[this.getActiveSlotIdx(bundleId)] ?? 'اختر منتجك';
  }

  onBackdropClick(bundleId: string, event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('bc-modal-backdrop')) {
      this.closeModal(bundleId);
    }
  }

  // ─── Slot Selection ───────────────────────────────────────────────────────

  selectProductForSlot(bundle: Bundle, product: Product): void {
    const slotIdx  = this.activeSlotIdx.get(bundle._id) ?? 0;
    const slots    = this.selectedSlots.get(bundle._id) ?? [null, null, null];
    slots[slotIdx] = product;
    this.selectedSlots.set(bundle._id, [...slots]);
    this.closeModal(bundle._id);

    // Play per-slot checkmark animation
    const anims    = this.checkAnim.get(bundle._id) ?? [false, false, false];
    anims[slotIdx] = true;
    this.checkAnim.set(bundle._id, [...anims]);
    setTimeout(() => {
      const a    = this.checkAnim.get(bundle._id) ?? [false, false, false];
      a[slotIdx] = false;
      this.checkAnim.set(bundle._id, [...a]);
      this.cdr.markForCheck();
    }, 1400);

    this.cdr.markForCheck();
  }

  getSlotProduct(bundleId: string, slotIdx: number): Product | null {
    return (this.selectedSlots.get(bundleId) ?? [null, null, null])[slotIdx] ?? null;
  }

  isSlotCheckAnimating(bundleId: string, slotIdx: number): boolean {
    return (this.checkAnim.get(bundleId) ?? [false, false, false])[slotIdx] ?? false;
  }

  allSlotsSelected(bundleId: string): boolean {
    const slots = this.selectedSlots.get(bundleId) ?? [];
    return slots.length === 3 && slots.every((s) => s !== null);
  }

  getSelectedProducts(bundleId: string): Product[] {
    return (this.selectedSlots.get(bundleId) ?? []).filter((p): p is Product => p !== null);
  }

  /**
   * Returns the allowed products for a given bundle.
   * Duplicates across slots ARE allowed per user preference.
   */
  getAllowedProducts(bundle: Bundle): Product[] {
    return (bundle.allowedProducts ?? []).filter(
      (p): p is Product => typeof p === 'object' && (p as Product).isActive !== false
    );
  }

  // ─── Cart Action ──────────────────────────────────────────────────────────

  addBundleToCart(bundle: Bundle, event?: Event): void {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    if (!this.allSlotsSelected(bundle._id) || this.isAdding.get(bundle._id)) return;

    const chosen = this.getSelectedProducts(bundle._id);
    this.isAdding.set(bundle._id, true);
    this.cdr.markForCheck();

    this.cartService.addBundleToCart(bundle, chosen, 1);
    this.cartDrawer.open();

    setTimeout(() => {
      this.isAdding.set(bundle._id, false);
      this.cdr.markForCheck();
    }, 1200);
  }

  isAddingBundle(bundleId: string): boolean {
    return this.isAdding.get(bundleId) ?? false;
  }

  // ─── Template Helpers ─────────────────────────────────────────────────────

  formatMediaUrl(url?: string): string {
    if (!url) return '';
    const raw = url.trim();
    if (raw.startsWith('http') || raw.startsWith('blob:') || raw.startsWith('assets/')) return raw;
    if (raw.startsWith('/uploads')) return `${environment.mediaBaseUrl}${raw}`;
    if (raw.startsWith('uploads'))  return `${environment.mediaBaseUrl}/${raw}`;
    return raw;
  }

  trackById(_: number, item: Bundle): string { return item._id; }
  trackByProductId(_: number, p: Product): string { return p._id; }
}
