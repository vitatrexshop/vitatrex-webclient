import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import {
  ApplyCouponRequest,
  ApplyCouponResponse,
  Coupon,
  CreateCouponRequest,
  UpdateCouponRequest,
} from '../models/coupon.model';

@Injectable({ providedIn: 'root' })
export class CouponService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}`;

  // ── Public: Apply coupon to cart ─────────────────────────────────────────
  applyCoupon(payload: ApplyCouponRequest): Observable<ApplyCouponResponse> {
    return this.http
      .post<{ success: boolean } & ApplyCouponResponse>(
        `${this.base}/coupons/apply`,
        payload
      )
      .pipe(map((res) => res as ApplyCouponResponse));
  }

  // ── Admin: List all coupons ──────────────────────────────────────────────
  getAllCoupons(token: string): Observable<Coupon[]> {
    return this.http
      .get<{ success: boolean; data: Coupon[] }>(
        `${this.base}/admin/coupons`,
        { headers: this.authHeaders(token) }
      )
      .pipe(map((res) => res.data));
  }

  // ── Admin: Create coupon ─────────────────────────────────────────────────
  createCoupon(payload: CreateCouponRequest, token: string): Observable<Coupon> {
    return this.http
      .post<{ success: boolean; data: Coupon }>(
        `${this.base}/admin/coupons`,
        payload,
        { headers: this.authHeaders(token) }
      )
      .pipe(map((res) => res.data));
  }

  // ── Admin: Update coupon ─────────────────────────────────────────────────
  updateCoupon(id: string, payload: UpdateCouponRequest, token: string): Observable<Coupon> {
    return this.http
      .put<{ success: boolean; data: Coupon }>(
        `${this.base}/admin/coupons/${id}`,
        payload,
        { headers: this.authHeaders(token) }
      )
      .pipe(map((res) => res.data));
  }

  // ── Admin: Delete coupon ─────────────────────────────────────────────────
  deleteCoupon(id: string, token: string): Observable<void> {
    return this.http
      .delete<void>(`${this.base}/admin/coupons/${id}`, {
        headers: this.authHeaders(token),
      });
  }

  // ── Admin: Toggle active status ──────────────────────────────────────────
  toggleCoupon(id: string, token: string): Observable<Coupon> {
    return this.http
      .patch<{ success: boolean; data: Coupon }>(
        `${this.base}/admin/coupons/${id}/toggle`,
        {},
        { headers: this.authHeaders(token) }
      )
      .pipe(map((res) => res.data));
  }

  private authHeaders(token: string): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }
}
