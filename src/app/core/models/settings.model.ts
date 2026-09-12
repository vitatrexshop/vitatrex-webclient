import { ApiResponse } from './api-response.model';

export interface HeroSettings {
  heroImageUrl?: string;
  heroMobileImageUrl?: string;
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

export interface ShippingSettings {
  _id?: string;
  freeShippingThreshold: number;
  isFreeShippingEnabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type ShippingSettingsResponse = ApiResponse<ShippingSettings>;
