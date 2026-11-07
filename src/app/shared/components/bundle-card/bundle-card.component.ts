import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  EventEmitter,
  HostListener,
  Inject,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  PLATFORM_ID,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { BundleService } from '../../../core/services/bundle.service';
import { CartService } from '../../../core/services/cart.service';
import { CartDrawerService } from '../../../core/services/cart-drawer.service';
import { LanguageService } from '../../../core/services/language.service';
import { Bundle } from '../../../core/models/bundle.model';
import { Product } from '../../../core/models/product.model';
import { environment } from '../../../../environments/environment';

/** Labels for each slot index — slot 2 is the free gift */
const SLOT_LABELS = ['المنتج الأول (120 قطعة)', 'المنتج الثاني (120 قطعة)', '🎁 هديتك المجانية (60 قطعة)'];
const SLOT_ARIA   = ['اختر المنتج الأول', 'اختر المنتج الثاني', 'اختر الهدية المجانية'];

@Component({
  selector: 'app-bundle-card',
  templateUrl: './bundle-card.component.html',
  styleUrls: ['./bundle-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BundleCardComponent implements OnInit, OnChanges, OnDestroy {
  @ViewChild('modalBackdrop') modalBackdrop?: ElementRef<HTMLElement>;

  /** If provided, renders as a standalone builder dialog for this specific bundle */
  @Input() modalBundle: Bundle | null = null;
  @Output() closeModal = new EventEmitter<void>();

  private readonly destroyRef      = inject(DestroyRef);
  private readonly cdr             = inject(ChangeDetectorRef);
  private readonly bundleService   = inject(BundleService);
  private readonly cartService     = inject(CartService);
  private readonly cartDrawer      = inject(CartDrawerService);
  readonly languageService         = inject(LanguageService);
  private readonly isBrowser: boolean;

  isLoading = true;
  bundles: Bundle[] = [];

  /** Slot labels exposed to template */
  readonly slotLabels = SLOT_LABELS;
  readonly slotAria   = SLOT_ARIA;

  // ── Per-bundle state maps ──────────────────────────────────────────────────
  /** bundleId → [slot0Product, slot1Product, slot2GiftProduct]  (null = not yet chosen) */
  selectedSlots  = new Map<string, (Product | null)[]>();
  /** bundleId → which slot index the modal is currently editing */
  activeSlotIdx  = new Map<string, number>();
  /** bundleId → modal open flag for slot product selection */
  showModal      = new Map<string, boolean>();
  /** bundleId → adding-to-cart animation flag */
  isAdding       = new Map<string, boolean>();
  /** bundleId → per-slot checkmark animation flags */
  checkAnim      = new Map<string, boolean[]>();

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    if (this.modalBundle) {
      this.initModalBundle(this.modalBundle);
    } else {
      this.fetchBundles();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['modalBundle'] && this.modalBundle) {
      this.initModalBundle(this.modalBundle);
    }
  }

  ngOnDestroy(): void {
    if (this.isBrowser && this.modalBundle) {
      document.body.style.overflow = '';
    }
  }

  @HostListener('document:keydown.escape')
  handleEscape(): void {
    // Check if any product picker modal is open first
    let pickerClosed = false;
    for (const [bundleId, isOpen] of this.showModal.entries()) {
      if (isOpen) {
        this.closeModalForSlot(bundleId);
        pickerClosed = true;
        break;
      }
    }

    if (!pickerClosed && this.modalBundle) {
      this.closeBuilderModal();
    }
  }

  private initModalBundle(bundle: Bundle): void {
    this.bundles = [bundle];
    if (!this.selectedSlots.has(bundle._id)) {
      this.selectedSlots.set(bundle._id, [null, null, null]);
      this.checkAnim.set(bundle._id, [false, false, false]);
    }
    this.isLoading = false;
    if (this.isBrowser) {
      document.body.style.overflow = 'hidden';
    }
    this.cdr.markForCheck();
  }

  private fetchBundles(): void {
    this.bundleService
      .getBundles()
      .pipe(catchError(() => of([])), takeUntilDestroyed(this.destroyRef))
      .subscribe((bundles) => {
        // Only show bundles that have at least 1 paid product AND 1 gift product (populated)
        this.bundles = (bundles ?? []).filter(
          (b) =>
            b.isActive !== false &&
            b.paidProducts?.length >= 1 &&
            b.giftProducts?.length >= 1 &&
            (b.paidProducts.some((p) => typeof p === 'object') ||
             b.giftProducts.some((p) => typeof p === 'object'))
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

  // ─── Pool Accessors ───────────────────────────────────────────────────────

  /** Returns paid products (120-count) for slots 0 and 1 */
  getPaidProducts(bundle: Bundle): Product[] {
    return (bundle.paidProducts ?? []).filter(
      (p): p is Product => typeof p === 'object' && (p as Product).isActive !== false
    );
  }

  /** Returns gift products (60-count) for slot 2 */
  getGiftProducts(bundle: Bundle): Product[] {
    return (bundle.giftProducts ?? []).filter(
      (p): p is Product => typeof p === 'object' && (p as Product).isActive !== false
    );
  }

  /** Returns the correct product pool for a given slot index */
  getProductsForSlot(bundle: Bundle, slotIdx: number): Product[] {
    return slotIdx < 2 ? this.getPaidProducts(bundle) : this.getGiftProducts(bundle);
  }

  /** True if the given slot is the free gift slot (slot 2) */
  isGiftSlot(slotIdx: number): boolean {
    return slotIdx === 2;
  }

  // ─── Builder Dialog Control ───────────────────────────────────────────────

  closeBuilderModal(): void {
    if (this.isBrowser) {
      document.body.style.overflow = '';
    }
    this.closeModal.emit();
  }

  onOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('bc-modal-builder-overlay')) {
      this.closeBuilderModal();
    }
  }

  // ─── Product Picker Modal Control ─────────────────────────────────────────

  openModalForSlot(bundleId: string, slotIdx: number): void {
    this.activeSlotIdx.set(bundleId, slotIdx);
    this.showModal.set(bundleId, true);
    if (this.isBrowser) document.body.style.overflow = 'hidden';
    this.cdr.markForCheck();
  }

  closeModalForSlot(bundleId: string): void {
    this.showModal.set(bundleId, false);
    if (this.isBrowser && !this.modalBundle) {
      document.body.style.overflow = '';
    }
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
      this.closeModalForSlot(bundleId);
    }
  }

  // ─── Slot Selection ───────────────────────────────────────────────────────

  selectProductForSlot(bundle: Bundle, product: Product): void {
    const slotIdx  = this.activeSlotIdx.get(bundle._id) ?? 0;
    const slots    = this.selectedSlots.get(bundle._id) ?? [null, null, null];
    slots[slotIdx] = product;
    this.selectedSlots.set(bundle._id, [...slots]);
    this.closeModalForSlot(bundle._id);

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

  // ─── Savings Calculation ──────────────────────────────────────────────────

  /**
   * Full savings = bundle discount + gift product original price.
   * Returns 0 if slots not yet fully selected.
   */
  getFullSavings(bundle: Bundle): number {
    const bundleSavings = Math.max(0, bundle.originalPrice - bundle.bundlePrice);
    const slots = this.selectedSlots.get(bundle._id) ?? [];
    const giftProd = slots[2] as Product | null;
    if (!giftProd) return bundleSavings;
    const giftVariant = giftProd.variants?.find((v) => v.count === 60) ?? giftProd.variants?.[0];
    const giftPrice = giftVariant?.price ?? 0;
    return bundleSavings + giftPrice;
  }

  // ─── Cart Action ──────────────────────────────────────────────────────────

  addBundleToCart(bundle: Bundle, event?: Event): void {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    if (!this.allSlotsSelected(bundle._id) || this.isAdding.get(bundle._id)) return;

    const slots     = this.selectedSlots.get(bundle._id) ?? [null, null, null];
    const paidProds = [slots[0], slots[1]].filter((p): p is Product => p !== null);
    const giftProd  = slots[2] as Product | null;

    if (paidProds.length !== 2 || !giftProd) return;

    this.isAdding.set(bundle._id, true);
    this.cdr.markForCheck();

    this.cartService.addBundleToCart(bundle, paidProds, giftProd, 1);
    this.cartDrawer.open();

    setTimeout(() => {
      this.isAdding.set(bundle._id, false);
      if (this.modalBundle) {
        this.closeBuilderModal();
      }
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

  trackById(_: number, item: Bundle): string         { return item._id; }
  trackByProductId(_: number, p: Product): string    { return p._id; }
}

