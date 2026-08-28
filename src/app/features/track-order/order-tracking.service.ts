import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { HttpErrorResponse, HttpParams } from '@angular/common/http';
import { ApiService } from '../../core/services/api.service';
import { TrackingData } from '../../core/models/order.model';

// ════════════════════════════════════════════════════════════════
// OrderTrackingService
// Wraps the public GET /api/v1/orders/track endpoint and manages
// the per-device localStorage token cache for returning visitors.
// ════════════════════════════════════════════════════════════════

@Injectable({ providedIn: 'root' })
export class OrderTrackingService {

  /** Path used by ApiService — prefixed with environment.apiUrl automatically */
  private readonly trackPath = '/orders/track';

  /** localStorage keys — 'vt_' prefix avoids collisions with other apps */
  private readonly LS_ORDER_NUMBER   = 'vt_tracking_orderNumber';
  private readonly LS_TRACKING_TOKEN = 'vt_tracking_token';

  constructor(private readonly api: ApiService) {}

  // ── API ─────────────────────────────────────────────────────────────────────

  /**
   * Verify the magic link token and fetch sanitized tracking data.
   * The backend re-hashes the rawToken and looks up by { orderNumber + hash + expiry }.
   * Returns HTTP 401 on any mismatch to prevent IDOR enumeration.
   */
  getTrackingData(orderNumber: string, rawToken: string): Observable<TrackingData> {
    const params = new HttpParams()
      .set('id',    orderNumber)
      .set('token', rawToken);

    return this.api.get<TrackingData>(this.trackPath, params).pipe(
      map((res) => res.data as TrackingData),
      catchError((err: HttpErrorResponse) => {
        const message =
          err.status === 400 ? 'رابط التتبع غير مكتمل. يرجى استخدام الرابط من رسالة تأكيد الطلب.' :
          err.status === 401 ? 'رابط التتبع غير صالح أو منتهي الصلاحية (تنتهي الروابط بعد 60 يومًا).' :
          err.status === 429 ? 'طلبات كثيرة جدًا. يرجى الانتظار لحظة والمحاولة مجددًا.' :
          'تعذّر تحميل معلومات الطلب. يرجى المحاولة لاحقًا.';
        return throwError(() => new Error(message));
      })
    );
  }

  // ── localStorage Helpers ─────────────────────────────────────────────────────

  /**
   * Save tracking credentials so the customer can revisit /track on the
   * same device without the original magic link URL.
   * Called from the checkout success handler immediately after order creation.
   */
  saveToStorage(orderNumber: string, trackingToken: string): void {
    try {
      localStorage.setItem(this.LS_ORDER_NUMBER,   orderNumber);
      localStorage.setItem(this.LS_TRACKING_TOKEN, trackingToken);
    } catch {
      // Ignore: storage quota exceeded or private/incognito mode
    }
  }

  /**
   * Read previously saved credentials from localStorage.
   * @returns { orderNumber, trackingToken } or null if nothing stored
   */
  getFromStorage(): { orderNumber: string; trackingToken: string } | null {
    try {
      const orderNumber   = localStorage.getItem(this.LS_ORDER_NUMBER);
      const trackingToken = localStorage.getItem(this.LS_TRACKING_TOKEN);
      return orderNumber && trackingToken ? { orderNumber, trackingToken } : null;
    } catch {
      return null;
    }
  }

  /** Remove saved credentials (e.g. after 401 / token expiry). */
  clearStorage(): void {
    try {
      localStorage.removeItem(this.LS_ORDER_NUMBER);
      localStorage.removeItem(this.LS_TRACKING_TOKEN);
    } catch {
      // Ignore
    }
  }
}
