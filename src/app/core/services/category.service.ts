import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';
import { Category } from '../models/category.model';

const CATEGORIES_API = '/categories';

/**
 * Category data service for storefront.
 * GET /api/v1/categories
 */
@Injectable({ providedIn: 'root' })
export class CategoryService {
  constructor(private readonly api: ApiService) {}

  /** Fetch active categories list */
  getCategories(): Observable<Category[]> {
    return this.api.get<Category[]>(CATEGORIES_API).pipe(
      map((res) => res.data ?? [])
    );
  }
}
