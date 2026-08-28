import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';
import {
  ApplyCouponRequest,
  ApplyCouponResponse,
  Coupon,
  CreateCouponRequest,
  UpdateCouponRequest,
} from '../models/coupon.model';
import { ApiResponse } from '../models/api-response.model';

const COUPONS_API = '/coupons';
const ADMIN_COUPONS_API = '/admin/coupons';

@Injectable({ providedIn: 'root' })
export class CouponService {
  private readonly api = inject(ApiService);

  // ── Public: Apply coupon to cart ─────────────────────────────────────────
  applyCoupon(payload: ApplyCouponRequest): Observable<ApplyCouponResponse> {
    return this.api
      .post<ApplyCouponResponse>(`${COUPONS_API}/apply`, payload)
      .pipe(map((res: any) => (res?.data ?? res) as ApplyCouponResponse));
  }

  // ── Admin: List all coupons ──────────────────────────────────────────────
  getAllCoupons(token?: string): Observable<Coupon[]> {
    return this.api
      .get<Coupon[]>(ADMIN_COUPONS_API)
      .pipe(map((res: any) => {
        const raw = res?.data ?? res;
        return Array.isArray(raw) ? raw : (raw?.coupons ?? []);
      }));
  }

  // ── Admin: Create coupon ─────────────────────────────────────────────────
  createCoupon(payload: CreateCouponRequest, token?: string): Observable<Coupon> {
    return this.api
      .post<Coupon>(ADMIN_COUPONS_API, payload)
      .pipe(map((res: any) => (res?.data ?? res) as Coupon));
  }

  // ── Admin: Update coupon ─────────────────────────────────────────────────
  updateCoupon(id: string, payload: UpdateCouponRequest, token?: string): Observable<Coupon> {
    return this.api
      .put<Coupon>(`${ADMIN_COUPONS_API}/${id}`, payload)
      .pipe(map((res: any) => (res?.data ?? res) as Coupon));
  }

  // ── Admin: Delete coupon ─────────────────────────────────────────────────
  deleteCoupon(id: string, token?: string): Observable<ApiResponse<null>> {
    return this.api.delete<null>(`${ADMIN_COUPONS_API}/${id}`);
  }

  // ── Admin: Toggle active status ──────────────────────────────────────────
  toggleCoupon(id: string, token?: string): Observable<Coupon> {
    return this.api
      .patch<Coupon>(`${ADMIN_COUPONS_API}/${id}/toggle`, {})
      .pipe(map((res: any) => (res?.data ?? res) as Coupon));
  }
}
