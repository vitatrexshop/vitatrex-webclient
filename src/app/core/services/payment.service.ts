import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';

export interface KashierCheckoutPayload {
  mid?:             string;
  merchantId:       string;
  orderId:          string;
  internalId:       string;
  orderNumber:      string;
  amount:           string;
  currency:         string;
  hash:             string;
  mode:             'test' | 'live';
  merchantRedirect?: string;
  checkoutUrl:      string;
  successUrl:       string;
  failUrl:          string;
  webhookUrl:       string;
}

@Injectable({ providedIn: 'root' })
export class PaymentService {
  constructor(private readonly api: ApiService) {}

  /**
   * Calls backend /api/v1/payment/kashier/checkout
   */
  initiateKashierCheckout(params: { orderId?: string; orderNumber?: string }): Observable<KashierCheckoutPayload> {
    return this.api.post<KashierCheckoutPayload>('/payment/kashier/checkout', params).pipe(
      map((res) => res.data as KashierCheckoutPayload)
    );
  }

  /**
   * Builds the clean redirect URL with only mandatory Kashier parameters.
   */
  buildKashierRedirectUrl(p: KashierCheckoutPayload): string {
    const merchantId = String(p.merchantId || p.mid || 'MID-50047-930').trim();
    if (!merchantId) {
      throw new Error('Kashier Merchant ID is missing!');
    }

    console.log('[Kashier Frontend Service] merchantId explicitly set to:', merchantId);
    console.log('[Kashier Frontend Service] Building redirect URL for orderId:', p.orderId, 'amount:', p.amount);

    const defaultBaseUrl = p.mode === 'test' ? 'https://test-iframe.kashier.io' : 'https://checkout.kashier.io';
    const baseUrl        = (p.checkoutUrl || defaultBaseUrl).replace(/\/+$/, '');
    const redirectTarget = p.merchantRedirect || p.successUrl || `${window.location.origin}/payment/success`;
    const mode           = p.mode || 'test';

    // Strictly assign both mid and merchantId to prevent undefined in iframe/redirect flows
    const params = new URLSearchParams({
      mid:              merchantId,
      merchantId:       merchantId,
      orderId:          p.orderId,
      amount:           p.amount,
      currency:         p.currency,
      hash:             p.hash,
      mode:             mode,
      merchantRedirect: redirectTarget,
    });

    const url = `${baseUrl}/?${params.toString()}`;
    console.log('[Kashier Frontend Service] Clean redirect URL:', url);
    return url;
  }
}
