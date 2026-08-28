import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';
import { HeroSettings, PromoVideoSettings } from '../models/settings.model';

const HERO_SETTINGS_API        = '/settings/hero';
const PROMO_VIDEO_SETTINGS_API = '/settings/promo-video';

@Injectable({ providedIn: 'root' })
export class SettingsService {
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
}

