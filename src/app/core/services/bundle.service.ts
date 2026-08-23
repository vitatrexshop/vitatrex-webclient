import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';
import { Bundle, BundlePayload } from '../models/bundle.model';
import { ApiResponse } from '../models/api-response.model';

const BUNDLES_API = '/api/v1/bundles';

@Injectable({ providedIn: 'root' })
export class BundleService {
  constructor(private readonly api: ApiService) {}

  /** Fetch all active bundles (public endpoint) */
  getBundles(): Observable<Bundle[]> {
    return this.api.get<Bundle[]>(BUNDLES_API).pipe(map((res) => res.data ?? []));
  }

  /** Fetch a single bundle by ID */
  getBundleById(id: string): Observable<Bundle> {
    return this.api.get<Bundle>(`${BUNDLES_API}/${id}`).pipe(map((res) => res.data as Bundle));
  }

  /** Create a new bundle (Admin / SuperAdmin only) */
  createBundle(payload: BundlePayload): Observable<Bundle> {
    return this.api.post<Bundle>(BUNDLES_API, payload).pipe(map((res) => res.data as Bundle));
  }

  /** Update an existing bundle (Admin / SuperAdmin only) */
  updateBundle(id: string, payload: Partial<BundlePayload>): Observable<Bundle> {
    return this.api.put<Bundle>(`${BUNDLES_API}/${id}`, payload).pipe(map((res) => res.data as Bundle));
  }

  /** Delete a bundle (Admin / SuperAdmin only) */
  deleteBundle(id: string): Observable<ApiResponse<null>> {
    return this.api.delete<null>(`${BUNDLES_API}/${id}`);
  }
}
