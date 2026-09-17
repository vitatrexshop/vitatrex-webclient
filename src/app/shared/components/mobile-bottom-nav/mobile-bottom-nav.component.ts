import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { FormControl } from '@angular/forms';
import { NavigationEnd, Router } from '@angular/router';
import { Observable, Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, map, startWith, switchMap, takeUntil, catchError, tap } from 'rxjs/operators';
import { CartService } from '../../../core/services/cart.service';
import { CartDrawerService } from '../../../core/services/cart-drawer.service';
import { ProductService, SearchResult } from '../../../core/services/product.service';
import { Product } from '../../../core/models/product.model';

@Component({
  selector: 'app-mobile-bottom-nav',
  templateUrl: './mobile-bottom-nav.component.html',
  styleUrls: ['./mobile-bottom-nav.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MobileBottomNavComponent implements OnInit, OnDestroy {
  private readonly cartService     = inject(CartService);
  private readonly cartDrawerService = inject(CartDrawerService);
  private readonly productService  = inject(ProductService);
  private readonly router          = inject(Router);
  private readonly cdr             = inject(ChangeDetectorRef);
  private readonly destroy$        = new Subject<void>();

  @ViewChild('searchInput') searchInputRef?: ElementRef<HTMLInputElement>;

  readonly itemCount$: Observable<number> = this.cartService.itemCount$;
  readonly isCartDrawerOpen$: Observable<boolean> = this.cartDrawerService.isOpen$;

  readonly isCheckoutPage$: Observable<boolean> = this.router.events.pipe(
    filter((event): event is NavigationEnd => event instanceof NavigationEnd),
    map((event) => event.urlAfterRedirects.includes('/checkout') || event.urlAfterRedirects.includes('/order-success')),
    startWith(this.router.url.includes('/checkout') || this.router.url.includes('/order-success'))
  );

  isSearchOpen = false;
  readonly searchControl = new FormControl('', { nonNullable: true });

  // ── Live Search State ──────────────────────────────────────────
  searchResults: Product[] = [];
  totalSearchResults = 0;
  isSearchLoading = false;
  showResults = false;

  ngOnInit(): void {
    // 300ms debounced live search — mirrors HeaderComponent pipeline
    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      tap((term) => {
        const trimmed = term?.trim() || '';
        if (trimmed.length < 2) {
          this.searchResults      = [];
          this.totalSearchResults = 0;
          this.showResults        = false;
          this.isSearchLoading    = false;
        } else {
          this.isSearchLoading = true;
          this.showResults     = true;
        }
        this.cdr.markForCheck();
      }),
      switchMap((term) => {
        const trimmed = term?.trim() || '';
        if (trimmed.length < 2) return of(null);
        return this.productService.searchProducts({ q: trimmed, limit: 6 }).pipe(
          catchError(() => of(null))
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe((result: SearchResult | null) => {
      this.isSearchLoading    = false;
      this.searchResults      = result?.docs ?? [];
      this.totalSearchResults = result?.total ?? 0;
      this.showResults        = (this.searchControl.value.trim().length >= 2);
      this.cdr.markForCheck();
    });
  }

  openCart(): void {
    this.isSearchOpen = false;
    this.cartDrawerService.open();
  }

  toggleSearch(): void {
    this.isSearchOpen = !this.isSearchOpen;
    if (this.isSearchOpen) {
      setTimeout(() => {
        this.searchInputRef?.nativeElement?.focus();
      }, 120);
    } else {
      this._resetSearch();
    }
  }

  closeSearch(): void {
    this.isSearchOpen = false;
    this._resetSearch();
  }

  navigateToProduct(slug: string): void {
    this._resetSearch();
    this.isSearchOpen = false;
    this.router.navigate(['/shop', slug]);
  }

  submitSearch(): void {
    const query = this.searchControl.value.trim();
    this.router.navigate(['/shop'], query ? { queryParams: { q: query } } : {});
    this._resetSearch();
    this.isSearchOpen = false;
  }

  private _resetSearch(): void {
    this.searchControl.reset();
    this.searchResults      = [];
    this.totalSearchResults = 0;
    this.showResults        = false;
    this.isSearchLoading    = false;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isSearchOpen) {
      this.closeSearch();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
