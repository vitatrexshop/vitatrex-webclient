import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { combineLatest, Observable, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, map, startWith, switchMap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ProductService } from '../../core/services/product.service';
import { OfferService } from '../../core/services/offer.service';
import { CategoryService } from '../../core/services/category.service';
import { BundleService } from '../../core/services/bundle.service';
import { LanguageService } from '../../core/services/language.service';
import { Product } from '../../core/models/product.model';
import { Offer } from '../../core/models/offer.model';
import { Bundle } from '../../core/models/bundle.model';

export interface FilterTab {
  id: string;
  name: string;
  slug?: string;
  icon?: string;
  isBundle?: boolean;
}

export interface ShopViewModel {
  bundles: Bundle[];
  offers: Offer[];
  products: Product[];
  showBundles: boolean;
  showOffers: boolean;
  showProducts: boolean;
  isEmpty: boolean;
  isBundleTab: boolean;
}

@Component({
  selector: 'app-shop',
  templateUrl: './shop.component.html',
  styleUrls: ['./shop.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShopComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly languageService = inject(LanguageService);

  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly selectedCategory$ = new FormControl('all', { nonNullable: true });

  tabs$!: Observable<FilterTab[]>;
  products$!: Observable<Product[]>;
  offers$!: Observable<Offer[]>;
  bundles$!: Observable<Bundle[]>;

  vm$!: Observable<ShopViewModel>;

  /** If set, opens the interactive 3-slot Bundle Builder modal */
  selectedBundleForBuilder: Bundle | null = null;

  constructor(
    private readonly productService: ProductService,
    private readonly offerService: OfferService,
    private readonly categoryService: CategoryService,
    private readonly bundleService: BundleService,
    private readonly route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // 1. Fetch dynamic categories and construct localized filter tabs
    this.tabs$ = this.languageService.currentLang$.pipe(
      switchMap(() => this.categoryService.getCategories()),
      map((dbCats) => {
        const allName = this.languageService.currentLang === 'ar' ? 'الكل' : 'All';
        const bundleName = this.languageService.currentLang === 'ar' ? 'باقات التوفير' : 'Value Bundles';

        const allTab: FilterTab = { id: 'all', name: allName, slug: 'all' };
        const dynamicTabs: FilterTab[] = dbCats.map((cat) => ({
          id: cat._id,
          name: cat.icon && !cat.icon.startsWith('http') ? cat.name : cat.name,
          slug: cat.slug,
          icon: cat.icon,
        }));
        const bundleTab: FilterTab = { id: 'bundle', name: bundleName, slug: 'bundle', isBundle: true };
        return [allTab, ...dynamicTabs, bundleTab];
      }),
      catchError(() => of([
        { id: 'all', name: this.languageService.currentLang === 'ar' ? 'الكل' : 'All', slug: 'all' },
        { id: 'bundle', name: this.languageService.currentLang === 'ar' ? 'باقات التوفير' : 'Value Bundles', slug: 'bundle', isBundle: true }
      ]))
    );

    // 2. Fetch raw datasets
    this.products$ = this.productService.getProducts().pipe(catchError(() => of([])));
    this.bundles$ = this.bundleService.getBundles().pipe(catchError(() => of([])));

    // 3. React to route query parameters
    this.route.queryParams
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        if (params['q']) {
          this.searchControl.setValue(params['q']);
        }
        if (params['type'] === 'bundle') {
          this.selectedCategory$.setValue('bundle');
        } else if (params['category']) {
          this.selectedCategory$.setValue(params['category']);
        }
      });

    // 4. Setup reactive streams
    const searchStream$ = this.searchControl.valueChanges.pipe(
      startWith(this.searchControl.value),
      debounceTime(300),
      distinctUntilChanged(),
      map((term) => term.trim().toLowerCase())
    );

    const categoryStream$ = this.selectedCategory$.valueChanges.pipe(
      startWith(this.selectedCategory$.value),
      distinctUntilChanged()
    );

    // Reactively fetch offers whenever category filter changes
    this.offers$ = categoryStream$.pipe(
      switchMap((catId) => {
        const catParam = catId === 'bundle' ? 'bundle' : (catId !== 'all' ? catId : undefined);
        return this.offerService.getOffers(catParam).pipe(catchError(() => of([])));
      })
    );

    // Helper: Valid bundle check (must be active and have both 120 and 60 pools)
    const isValidBundle = (b: Bundle): boolean => {
      return (
        Boolean(b) &&
        b.isActive !== false &&
        Array.isArray(b.paidProducts) &&
        b.paidProducts.length >= 1 &&
        Array.isArray(b.giftProducts) &&
        b.giftProducts.length >= 1 &&
        (b.paidProducts.some((p) => typeof p === 'object') ||
         b.giftProducts.some((p) => typeof p === 'object'))
      );
    };

    // 5. Unified ViewModel combining products, bundles, and offers
    this.vm$ = combineLatest([
      this.products$,
      this.bundles$,
      this.offers$,
      categoryStream$,
      searchStream$,
    ]).pipe(
      map(([products, rawBundles, offers, activeCatId, search]) => {
        // 5a. Filter bundles
        const validBundles = (rawBundles || []).filter(isValidBundle);
        const filteredBundles = validBundles.filter((b) => {
          if (!search) return true;
          const titleMatch = b.title?.toLowerCase().includes(search);
          const descMatch = b.description?.toLowerCase().includes(search);
          const badgeMatch = b.badgeText?.toLowerCase().includes(search);
          const keywordMatch =
            search.includes('باق') ||
            search.includes('bundle') ||
            search.includes('توفير') ||
            search.includes('اصنع');
          return Boolean(titleMatch || descMatch || badgeMatch || keywordMatch);
        });

        // 5b. Filter products
        const filteredProducts = (products || []).filter((p) => {
          let matchesCat = activeCatId === 'all';
          if (!matchesCat && p.category) {
            if (typeof p.category === 'object') {
              matchesCat = p.category._id === activeCatId || p.category.slug === activeCatId;
            } else {
              matchesCat = p.category === activeCatId;
            }
          }

          const matchesSearch =
            !search ||
            p.name?.toLowerCase().includes(search) ||
            p.description?.toLowerCase().includes(search) ||
            p.benefits?.some((b) => b.toLowerCase().includes(search));

          return matchesCat && matchesSearch;
        });

        // 5c. Filter offers
        const filteredOffers = (offers || []).filter((o) => {
          return (
            !search ||
            o.title?.toLowerCase().includes(search) ||
            o.description?.toLowerCase().includes(search)
          );
        });

        // 5d. Visibility flags per active tab:
        // - 'all': displays bundles and products (no offers)
        // - 'bundle': displays ONLY bundles and offers (no single products)
        // - specific category: displays ONLY category products (no bundles, no offers)
        const isBundleTab = activeCatId === 'bundle';
        const isAllTab = activeCatId === 'all';

        const showBundles = isAllTab || isBundleTab;
        const showOffers = isBundleTab;
        const showProducts = !isBundleTab;

        const displayedBundles = showBundles ? filteredBundles : [];
        const displayedOffers = showOffers ? filteredOffers : [];
        const displayedProducts = showProducts ? filteredProducts : [];

        const totalItems = displayedBundles.length + displayedOffers.length + displayedProducts.length;

        return {
          bundles: displayedBundles,
          offers: displayedOffers,
          products: displayedProducts,
          showBundles,
          showOffers,
          showProducts,
          isEmpty: totalItems === 0,
          isBundleTab,
        };
      })
    );
  }

  setCategory(catId: string): void {
    this.selectedCategory$.setValue(catId);
  }

  openBundleBuilder(bundle: Bundle): void {
    this.selectedBundleForBuilder = bundle;
  }

  closeBundleBuilder(): void {
    this.selectedBundleForBuilder = null;
  }

  trackByTab(_: number, item: FilterTab): string { return item.id; }
  trackByProduct(_: number, item: Product): string { return item._id; }
  trackByOffer(_: number, item: Offer): string { return item._id; }
  trackByBundle(_: number, item: Bundle): string { return item._id; }
}
