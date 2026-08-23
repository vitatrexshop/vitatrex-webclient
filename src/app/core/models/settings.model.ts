import { ApiResponse } from './api-response.model';

export interface HeroSettings {
  heroImageUrl?: string;
  brandName?: string;
  slogan?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type HeroSettingsResponse = ApiResponse<HeroSettings>;

export interface PromoVideoSettings {
  videoUrl?: string;
  posterImageUrl?: string;
  title?: string;
  subtitle?: string;
}

export type PromoVideoSettingsResponse = ApiResponse<PromoVideoSettings>;
