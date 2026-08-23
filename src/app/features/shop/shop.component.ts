import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { combineLatest, Observable, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, map, startWith, switchMap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ProductService } from '../../core/services/product.service';
import { OfferService } from '../../core/services/offer.service';
import { CategoryService } from '../../core/services/category.service';
import { LanguageService } from '../../core/services/language.service';
import { Product } from '../../core/models/product.model';
import { Offer } from '../../core/models/offer.model';

export interface FilterTab {
  id: string;
  name: string;
  slug?: string;
  icon?: string;
  isBundle?: boolean;
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

  filteredProducts$!: Observable<Product[]>;
  filteredOffers$!: Observable<Offer[]>;
  isBundleMode$!: Observable<boolean>;

  constructor(
    private readonly productService: ProductService,
    private readonly offerService: OfferService,
    private readonly categoryService: CategoryService,
    private readonly route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // 1. Fetch dynamic categories and construct localized filter tabs
    this.tabs$ = this.languageService.currentLang$.pipe(
      switchMap(() => this.categoryService.getCategories()),
      map((dbCats) => {
        const allName = this.languageService.currentLang === 'ar' ? 'الكل' : 'All';
        const bundleName = this.languageService.currentLang === 'ar' ? 'باقات التوفير 🎁' : 'Value Bundles 🎁';

        const allTab: FilterTab = { id: 'all', name: allName, slug: 'all' };
        const dynamicTabs: FilterTab[] = dbCats.map((cat) => ({
          id: cat._id,
          name: cat.icon && !cat.icon.startsWith('http') ? `${cat.icon} ${cat.name}` : cat.name,
          slug: cat.slug,
          icon: cat.icon,
        }));
        const bundleTab: FilterTab = { id: 'bundle', name: bundleName, slug: 'bundle', isBundle: true };
        return [allTab, ...dynamicTabs, bundleTab];
      }),
      catchError(() => of([
        { id: 'all', name: this.languageService.currentLang === 'ar' ? 'الكل' : 'All', slug: 'all' },
        { id: 'bundle', name: this.languageService.currentLang === 'ar' ? 'باقات التوفير 🎁' : 'Value Bundles 🎁', slug: 'bundle', isBundle: true }
      ]))
    );

    // 2. Fetch raw datasets
    this.products$ = this.productService.getProducts().pipe(catchError(() => of([])));
    this.offers$ = this.offerService.getOffers().pipe(catchError(() => of([])));

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

    // 4. Setup reactive search stream
    const searchStream$ = this.searchControl.valueChanges.pipe(
      startWith(this.searchControl.value),
      debounceTime(300),
      distinctUntilChanged(),
      map(term => term.trim().toLowerCase())
    );

    const categoryStream$ = this.selectedCategory$.valueChanges.pipe(
      startWith(this.selectedCategory$.value)
    );

    this.isBundleMode$ = categoryStream$.pipe(
      map(catId => catId === 'bundle')
    );

    this.filteredProducts$ = combineLatest([
      this.products$,
      categoryStream$,
      searchStream$,
    ]).pipe(
      map(([products, activeCatId, search]) => {
        return products.filter((p) => {
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
            p.name.toLowerCase().includes(search) ||
            p.description?.toLowerCase().includes(search) ||
            p.benefits?.some((b) => b.toLowerCase().includes(search));

          return matchesCat && matchesSearch;
        });
      })
    );

    this.filteredOffers$ = combineLatest([
      this.offers$,
      searchStream$,
    ]).pipe(
      map(([offers, search]) => {
        return offers.filter((o) => {
          return (
            !search ||
            o.title.toLowerCase().includes(search) ||
            o.description?.toLowerCase().includes(search)
          );
        });
      })
    );
  }

  setCategory(catId: string): void {
    this.selectedCategory$.setValue(catId);
  }

  trackByTab(_: number, item: FilterTab): string { return item.id; }
  trackByProduct(_: number, item: Product): string { return item._id; }
  trackByOffer(_: number, item: Offer): string { return item._id; }
}
