import { ApiResponse } from './api-response.model';

export interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type CategoryResponse = ApiResponse<Category>;
export type CategoryListResponse = ApiResponse<Category[]>;
