import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  inject,
  OnDestroy,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable, Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, takeUntil, catchError, tap } from 'rxjs/operators';
import { CartService } from '../../../core/services/cart.service';
import { CartDrawerService } from '../../../core/services/cart-drawer.service';
import { LanguageService, LanguageCode } from '../../../core/services/language.service';
import { ProductService, SearchResult } from '../../../core/services/product.service';
import { Product } from '../../../core/models/product.model';

/**
 * Redesigned luxury glassmorphism header with multi-link navigation.
 * - Comprehensive links: Home, Shop, About Us, Contact, Track Order
 * - Scroll-aware frosted glass elevation
 * - Real-time reactive cart count badge with pulse animation
 * - Language switcher (Arabic / English)
 * - Expandable search capsule with live 300ms debounced suggestions dropdown
 * - Interactive mobile navigation drawer with live search preview
 */
@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent implements OnInit, OnDestroy {
  private readonly cartService       = inject(CartService);
  private readonly cartDrawerService = inject(CartDrawerService);
  private readonly languageService   = inject(LanguageService);
  private readonly productService    = inject(ProductService);
  private readonly router            = inject(Router);
  private readonly cdr               = inject(ChangeDetectorRef);

  readonly itemCount$: Observable<number>        = this.cartService.itemCount$;
  readonly currentLang$: Observable<LanguageCode> = this.languageService.currentLang$;

  readonly isScrolled = signal(false);
  isMenuOpen   = false;
  isSearchOpen = false;
  readonly searchControl = new FormControl('', { nonNullable: true });

  // ── Live Search State ──────────────────────────────────────────────────────
  searchResults: Product[]  = [];
  totalSearchResults        = 0;
  isSearchLoading           = false;
  showDropdown              = false;
  private readonly destroy$ = new Subject<void>();

  @ViewChild('searchInputField') searchInputField?: ElementRef<HTMLInputElement>;

  ngOnInit(): void {
    // 300ms debounce on keystrokes -> distinctUntilChanged -> switchMap to MongoDB search
    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      tap((term) => {
        const trimmed = term?.trim() || '';
        if (trimmed.length < 2) {
          this.searchResults      = [];
          this.totalSearchResults = 0;
          this.showDropdown       = false;
          this.isSearchLoading    = false;
          this.cdr.markForCheck();
        } else {
          this.isSearchLoading = true;
          this.showDropdown    = true;
          this.cdr.markForCheck();
        }
      }),
      switchMap((term) => {
        const trimmed = term?.trim() || '';
        if (trimmed.length < 2) return of(null);
        return this.productService.searchProducts({ q: trimmed, limit: 5 }).pipe(
          catchError(() => of(null))
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe((result: SearchResult | null) => {
      this.isSearchLoading    = false;
      this.searchResults      = result?.docs ?? [];
      this.totalSearchResults = result?.total ?? 0;
      const currentTerm       = this.searchControl.value.trim();
      this.showDropdown       = (this.isSearchOpen || this.isMenuOpen) && currentTerm.length >= 2;
      this.cdr.markForCheck();
    });
  }

  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    if (typeof window !== 'undefined') {
      this.isScrolled.set(window.scrollY > 24);
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (this.isMenuOpen && !target.closest('.site-header-wrapper')) {
      this.closeMenu();
    }
    // Close live suggestions dropdown when clicking outside search wrapper
    if (this.showDropdown && !target.closest('.search-action-wrap') && !target.closest('.mobile-sheet-search-wrap')) {
      this.showDropdown = false;
      this.cdr.markForCheck();
    }
  }

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
    if (this.isMenuOpen) {
      this.isSearchOpen = false;
    }
  }

  closeMenu(): void {
    this.isMenuOpen = false;
    this.showDropdown = false;
  }

  toggleSearch(): void {
    this.isSearchOpen = !this.isSearchOpen;
    if (this.isSearchOpen) {
      setTimeout(() => {
        this.searchInputField?.nativeElement?.focus();
      }, 100);
    } else {
      this.clearSearch();
    }
  }

  clearSearch(): void {
    this.searchControl.reset();
    this.searchResults      = [];
    this.totalSearchResults = 0;
    this.showDropdown       = false;
    this.isSearchLoading    = false;
    this.cdr.markForCheck();
  }

  navigateToProduct(slug: string): void {
    this.clearSearch();
    this.isSearchOpen = false;
    this.closeMenu();
    this.router.navigate(['/shop', slug]);
  }

  openCart(): void {
    this.cartDrawerService.toggle();
  }

  switchLanguage(): void {
    this.languageService.toggleLanguage();
  }

  scrollToAbout(event?: Event): void {
    if (event) event.preventDefault();
    this.closeMenu();
    if (this.router.url === '/' || this.router.url === '') {
      const el = document.querySelector('.hero-manifesto-strip') || document.querySelector('.promo-video-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }
    this.router.navigate(['/']).then(() => {
      setTimeout(() => {
        const el = document.querySelector('.hero-manifesto-strip') || document.querySelector('.promo-video-section');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
    });
  }

  scrollToContact(event?: Event): void {
    if (event) event.preventDefault();
    this.closeMenu();
    const footer = document.querySelector('app-footer') || document.querySelector('footer');
    if (footer) {
      footer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  submitSearch(): void {
    const term = this.searchControl.value.trim();
    this.router.navigate(['/shop'], term ? { queryParams: { q: term } } : {});
    this.clearSearch();
    this.isSearchOpen = false;
    this.closeMenu();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
