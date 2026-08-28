import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';
import { Order, OrderInput, CreateOrderData } from '../models/order.model';

const ORDERS_API = '/orders';

/**
 * Handles all order-related API calls.
 *
 * Architecture note: This service is intentionally thin - it delegates
 * payment strategy execution to the backend. Future gateway integrations
 * (Paymob, Tap) are handled server-side with zero changes needed here.
 */
@Injectable({ providedIn: 'root' })
export class OrderService {
  constructor(private readonly api: ApiService) {}

  /**
   * Submit a guest checkout order to the backend.
   * Backend handles: price validation, stock deduction, payment strategy dispatch.
   * Returns the created Order summary including trackingUrl.
   */
  submitGuestOrder(payload: OrderInput): Observable<CreateOrderData> {
    return this.api.post<CreateOrderData>(ORDERS_API, payload).pipe(
      map((res) => res.data as CreateOrderData)
    );
  }

  /**
   * Fetch a single order by its human-readable orderNumber (e.g. "VT-84920").
   * Used by the Order Success confirmation page after checkout.
   */
  getOrderByNumber(orderNumber: string): Observable<Order> {
    return this.api.get<Order>(`${ORDERS_API}/number/${orderNumber}`).pipe(
      map((res) => res.data as Order)
    );
  }

  /**
   * Fetch a single order by MongoDB _id.
   * Used by admin dashboard order detail view.
   */
  getOrderById(id: string): Observable<Order> {
    return this.api.get<Order>(`${ORDERS_API}/admin/${id}`).pipe(
      map((res) => res.data as Order)
    );
  }
}
