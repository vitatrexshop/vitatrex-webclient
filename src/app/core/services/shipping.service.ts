import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { ApiService } from './api.service';
import { GovernorateOption } from '../models/order.model';

const SHIPPING_API = '/shipping';

/**
 * Service to fetch Egyptian governorates shipping fees and delivery timeline matrix.
 */
@Injectable({ providedIn: 'root' })
export class ShippingService {
  private readonly governorates$: Observable<GovernorateOption[]>;

  constructor(private readonly api: ApiService) {
    this.governorates$ = this.api
      .get<GovernorateOption[]>(`${SHIPPING_API}/governorates`)
      .pipe(
        map((res) => {
          const list = (res.data as GovernorateOption[]) ?? [];
          const seen = new Set<string>();
          const cleaned: GovernorateOption[] = [];
          for (const item of list) {
            const govName = item.governorate === 'الدهقلية' ? 'الدقهلية' : item.governorate;
            if (!seen.has(govName)) {
              seen.add(govName);
              cleaned.push({ ...item, governorate: govName });
            }
          }
          return cleaned.sort((a, b) => a.governorate.localeCompare(b.governorate, 'ar'));
        }),
        shareReplay(1)
      );
  }

  /**
   * Returns a cached, sorted list of all active Egyptian governorates.
   */
  getGovernorates(): Observable<GovernorateOption[]> {
    return this.governorates$;
  }
}
