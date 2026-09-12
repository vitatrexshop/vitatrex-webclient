import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { ApiService } from './api.service';
import { HeroSettings, PromoVideoSettings, ShippingSettings } from '../models/settings.model';

const HERO_SETTINGS_API        = '/settings/hero';
const PROMO_VIDEO_SETTINGS_API = '/settings/promo-video';
const SHIPPING_SETTINGS_API    = '/settings/shipping';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private shippingSettings$?: Observable<ShippingSettings>;

  constructor(private readonly api: ApiService) {}

  /** Fetch dynamic hero banner settings from GET /api/v1/settings/hero */
  getHeroSettings(): Observable<HeroSettings> {
    return this.api.get<HeroSettings>(HERO_SETTINGS_API).pipe(
      map((res: any) => (res?.data ?? res) as HeroSettings)
    );
  }

  /** Fetch dynamic promo video settings from GET /api/v1/settings/promo-video */
  getPromoVideoSettings(): Observable<PromoVideoSettings> {
    return this.api.get<PromoVideoSettings>(PROMO_VIDEO_SETTINGS_API).pipe(
      map((res: any) => (res?.data ?? res) as PromoVideoSettings)
    );
  }

  /** Fetch dynamic shipping settings (free shipping threshold) from GET /api/v1/settings/shipping */
  getShippingSettings(): Observable<ShippingSettings> {
    if (!this.shippingSettings$) {
      this.shippingSettings$ = this.api.get<ShippingSettings>(SHIPPING_SETTINGS_API).pipe(
        map((res: any) => {
          const raw = res?.data ?? res;
          return {
            freeShippingThreshold: typeof raw?.freeShippingThreshold === 'number' ? raw.freeShippingThreshold : 500,
            isFreeShippingEnabled: raw?.isFreeShippingEnabled !== false,
          } as ShippingSettings;
        }),
        shareReplay(1)
      );
    }
    return this.shippingSettings$;
  }
}


