import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';

/**
 * Low-level HTTP wrapper that prefixes all calls with the environment apiUrl.
 * Feature services call this instead of HttpClient directly so the base URL
 * is managed in exactly one place.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  private resolveUrl(path: string): string {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    const base = (this.baseUrl || '').replace(/\/+$/, '');
    let cleanPath = path.startsWith('/') ? path : `/${path}`;
    // Prevent accidental /api/v1/api/v1 duplication
    if (base.endsWith('/api/v1') && cleanPath.startsWith('/api/v1/')) {
      cleanPath = cleanPath.substring(7);
    }
    return `${base}${cleanPath}`;
  }

  get<T>(path: string, params?: HttpParams): Observable<ApiResponse<T>> {
    return this.http.get<ApiResponse<T>>(this.resolveUrl(path), { params });
  }

  post<T>(path: string, body: unknown): Observable<ApiResponse<T>> {
    return this.http.post<ApiResponse<T>>(this.resolveUrl(path), body);
  }

  put<T>(path: string, body: unknown): Observable<ApiResponse<T>> {
    return this.http.put<ApiResponse<T>>(this.resolveUrl(path), body, {
      withCredentials: true,
    });
  }

  patch<T>(path: string, body: unknown): Observable<ApiResponse<T>> {
    return this.http.patch<ApiResponse<T>>(this.resolveUrl(path), body, {
      withCredentials: true,
    });
  }

  delete<T>(path: string): Observable<ApiResponse<T>> {
    return this.http.delete<ApiResponse<T>>(this.resolveUrl(path), {
      withCredentials: true,
    });
  }
}
