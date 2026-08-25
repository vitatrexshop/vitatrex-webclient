import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';
import { Product } from '../models/product.model';

const PRODUCTS_API = '/api/v1/products';

export interface SearchResult {
  docs: Product[];
  total: number;
  page: number;
  totalPages: number;
  strategy: 'text' | 'regex' | 'none';
}

export interface SearchParams {
  q: string;
  page?: number;
  limit?: number;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
}

/**
 * All product-related data fetching for the storefront.
 * Handles array responses, wrapped `{ data: [...] }`, and `{ products: [...] }` formats safely.
 */
@Injectable({ providedIn: 'root' })
export class ProductService {
  constructor(private readonly api: ApiService) {}

  /** Fetch active product catalog (optionally filtered by category ID or slug) */
  getProducts(categoryId?: string): Observable<Product[]> {
    let params: HttpParams | undefined;
    if (categoryId && categoryId !== 'all') {
      params = new HttpParams().set('category', categoryId);
    }
    return this.api.get<Product[]>(PRODUCTS_API, params).pipe(
      map((res: any) => {
        let list: Product[] = [];
        if (Array.isArray(res)) {
          list = res;
        } else if (res && Array.isArray(res.data)) {
          list = res.data;
        } else if (res && Array.isArray(res.products)) {
          list = res.products;
        }
        return list.filter((p) => p && p.isActive !== false);
      })
    );
  }

  /** Fetch a single product by its URL slug */
  getProductBySlug(slug: string): Observable<Product> {
    return this.api.get<Product>(`${PRODUCTS_API}/${slug}`).pipe(
      map((res: any) => (res?.data ?? res) as Product)
    );
  }

  /** Client-side bestseller filter */
  getBestsellers(): Observable<Product[]> {
    return this.getProducts().pipe(
      map((products) => products.filter((p) => Boolean(p.isBestSeller)))
    );
  }

  /** Client-side featured filter */
  getFeatured(): Observable<Product[]> {
    return this.getProducts().pipe(
      map((products) => products.filter((p) => Boolean(p.isFeatured)))
    );
  }

  /**
   * Full-text product search using the MongoDB text index.
   * Supports pagination, category filter, and price range.
   */
  searchProducts(params: SearchParams): Observable<SearchResult> {
    let httpParams = new HttpParams().set('q', params.q);
    if (params.page)     httpParams = httpParams.set('page',     String(params.page));
    if (params.limit)    httpParams = httpParams.set('limit',    String(params.limit));
    if (params.category) httpParams = httpParams.set('category', params.category);
    if (params.minPrice) httpParams = httpParams.set('minPrice', String(params.minPrice));
    if (params.maxPrice) httpParams = httpParams.set('maxPrice', String(params.maxPrice));

    return this.api.get<SearchResult>(`${PRODUCTS_API}/search`, httpParams).pipe(
      map((res: any) => (res?.data ?? res) as SearchResult)
    );
  }
}

