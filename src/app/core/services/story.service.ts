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
      .get<StoryListResponse>(this.apiBase)
      .pipe(map((res) => this.sanitizeResponse(res)));
  }

  /**
   * Sanitize all story URLs on the way in from the API:
   *  1. productLink: strip localhost origin → relative path (prevents Mixed Content)
   *  2. videoUrl / posterUrl: convert http:// → https:// (prevents Mixed Content on prod HTTPS)
   */
  private sanitizeResponse(res: StoryListResponse): StoryListResponse {
    if (!res?.data) return res;
    return {
      ...res,
      data: res.data.map((story) => ({
        ...story,
        productLink: this.sanitizeProductLink(story.productLink),
        videoUrl:    this.enforceHttps(story.videoUrl),
        posterUrl:   this.enforceHttps(story.posterUrl),
      })),
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
}
