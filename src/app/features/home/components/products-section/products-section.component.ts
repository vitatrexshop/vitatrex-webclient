import { ChangeDetectionStrategy, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { ProductService } from '../../../../core/services/product.service';
import { Product } from '../../../../core/models/product.model';

export interface CategoryOption {
  id: string;
  labelKey: string;
}

@Component({
  selector: 'app-products-section',
  templateUrl: './products-section.component.html',
  styleUrls: ['./products-section.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductsSectionComponent implements OnInit {
  @ViewChild('marqueeTrack', { static: false }) marqueeTrack!: ElementRef<HTMLDivElement>;

  categories: CategoryOption[] = [
    { id: 'all', labelKey: 'PRODUCTS_SECTION.CAT_ALL' },
    { id: 'immunity', labelKey: 'PRODUCTS_SECTION.CAT_IMMUNITY' },
    { id: 'kids', labelKey: 'PRODUCTS_SECTION.CAT_KIDS' },
    { id: 'energy', labelKey: 'PRODUCTS_SECTION.CAT_ENERGY' },
    { id: 'sleep', labelKey: 'PRODUCTS_SECTION.CAT_SLEEP' },
  ];

  selectedCategory$ = new BehaviorSubject<string>('all');
  filteredProducts$!: Observable<Product[]>;

  isPaused = false;

  constructor(private readonly productService: ProductService) {}

  ngOnInit(): void {
    const allProducts$ = this.productService.getProducts();

    this.filteredProducts$ = combineLatest([allProducts$, this.selectedCategory$]).pipe(
      map(([products, categoryId]) => {
        if (!categoryId || categoryId === 'all') {
          return products;
        }
        return products.filter((p) => {
          const cat = p.category;
          if (!cat) return false;
          const slug = typeof cat === 'object' ? (cat.slug ?? cat.name ?? '') : cat;
          return slug.toLowerCase().includes(categoryId.toLowerCase());
        });
      })
    );
  }

  setCategory(id: string): void {
    this.selectedCategory$.next(id);
  }

  /**
   * Generates a repeated batch of items (minimum 8 cards)
   * so the CSS -50% marquee translation is 100% seamless and truly endless on any screen.
   */
  getRepeatedProducts(products: Product[]): Product[] {
    if (!products || products.length === 0) return [];
    let list: Product[] = [];
    while (list.length < 8) {
      list = [...list, ...products];
    }
    return list;
  }

  trackByIndex(index: number): number {
    return index;
  }

  trackById(_: number, product: Product): string {
    return product._id;
  }
}
