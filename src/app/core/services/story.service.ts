import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Story, StoryListResponse } from '../models/story.model';
import { environment } from '../../../environments/environment';

/** KNOWN localhost origins to strip when sanitizing productLink URLs */
const LOCALHOST_ORIGINS = [
  'http://localhost:4200',
  'https://localhost:4200',
  'http://localhost:3000',
  'http://localhost:5000',
];

@Injectable({ providedIn: 'root' })
export class StoryService {
  private readonly apiBase = `${environment.apiUrl}/stories`;

  constructor(private http: HttpClient) {}

  /** Public – GET active story items */
  getStories(): Observable<StoryListResponse> {
    return this.http
      .get<StoryListResponse | Story[]>(this.apiBase)
      .pipe(map((res) => this.sanitizeResponse(res)));
  }

  /**
   * Sanitize all story URLs on the way in from the API:
   *  1. productLink: strip localhost origin → relative path (prevents Mixed Content)
   *  2. videoUrl / posterUrl: convert http:// → https:// (prevents Mixed Content on prod HTTPS)
   */
  private sanitizeResponse(res: any): StoryListResponse {
    if (!res) {
      return { success: false, data: [] };
    }
    if (Array.isArray(res)) {
      return {
        success: true,
        data: res.map((story) => this.sanitizeStory(story)),
      };
    }
    const dataList = Array.isArray(res.data) ? res.data : [];
    return {
      success: res.success ?? true,
      data: dataList.map((story: Story) => this.sanitizeStory(story)),
    };
  }

  private sanitizeStory(story: Story): Story {
    return {
      ...story,
      productLink: this.sanitizeProductLink(story.productLink),
      videoUrl:    this.enforceHttps(story.videoUrl),
      // Resize Unsplash poster thumbnails to match the 295px card container
      posterUrl:   this.optimizeUnsplashUrl(this.enforceHttps(story.posterUrl)),
    };
  }

  /**
   * Convert absolute localhost URLs to relative paths.
   * e.g. "http://localhost:4200/shop/product-slug" → "/shop/product-slug"
   * Absolute production URLs are left untouched.
   */
  sanitizeProductLink(link?: string): string {
    if (!link) return '';
    const trimmed = link.trim();
    for (const origin of LOCALHOST_ORIGINS) {
      if (trimmed.startsWith(origin)) {
        return trimmed.slice(origin.length) || '/';
      }
    }
    return trimmed;
  }

  /**
   * Force http:// → https:// for video and image asset URLs so that a
   * production HTTPS page does not trigger a Mixed Content browser block.
   */
  private enforceHttps(url?: string): string {
    if (!url) return '';
    const trimmed = url.trim();
    // Only upgrade plain http, never touch https / blob / relative paths
    if (trimmed.startsWith('http://')) {
      return 'https://' + trimmed.slice('http://'.length);
    }
    return trimmed;
  }

  /**
   * Resizes Unsplash image URLs to match the exact card container width (295px).
   * Replaces any existing `w=` query param with `w=300` to avoid downloading
   * oversized assets for a 295×443 thumbnail slot.
   */
  private optimizeUnsplashUrl(url: string, width = 300): string {
    if (!url || !url.includes('images.unsplash.com')) return url;
    // Replace existing w= param, or append if absent
    if (/[?&]w=/.test(url)) {
      return url.replace(/([?&]w=)\d+/, `$1${width}`);
    }
    return url + (url.includes('?') ? `&w=${width}` : `?w=${width}`);
  }
}
