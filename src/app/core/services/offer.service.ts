import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';
import { Offer, OfferPayload } from '../models/offer.model';
import { ApiResponse } from '../models/api-response.model';

const OFFERS_API = '/api/v1/offers';

/**
 * Manages bundle / promotional offer data for the storefront.
 * Public methods: getOffers(), getOfferBySlug().
 * Admin methods (createOffer, updateOffer, deleteOffer) are also included
 * for the future admin panel integration.
 */
@Injectable({ providedIn: 'root' })
export class OfferService {
  constructor(private readonly api: ApiService) {}

  /** Fetch all active offers (public endpoint) */
  getOffers(): Observable<Offer[]> {
    return this.api.get<Offer[]>(OFFERS_API).pipe(
      map((res) => res.data ?? [])
    );
  }

  /** Fetch a single offer by slug */
  getOfferBySlug(slug: string): Observable<Offer> {
    return this.api.get<Offer>(`${OFFERS_API}/${slug}`).pipe(
      map((res) => res.data as Offer)
    );
  }

  /** Create a new offer (Admin / SuperAdmin only) */
  createOffer(payload: OfferPayload): Observable<Offer> {
    return this.api.post<Offer>(OFFERS_API, payload).pipe(
      map((res) => res.data as Offer)
    );
  }

  /** Update an existing offer (Admin / SuperAdmin only) */
  updateOffer(id: string, payload: Partial<OfferPayload>): Observable<Offer> {
    return this.api.put<Offer>(`${OFFERS_API}/${id}`, payload).pipe(
      map((res) => res.data as Offer)
    );
  }

  /** Delete an offer (Admin / SuperAdmin only) */
  deleteOffer(id: string): Observable<ApiResponse> {
    return this.api.delete<null>(`${OFFERS_API}/${id}`);
  }
}
