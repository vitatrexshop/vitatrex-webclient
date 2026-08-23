import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { StoryListResponse } from '../models/story.model';

const API_BASE = '/api/v1/stories';

@Injectable({ providedIn: 'root' })
export class StoryService {
  constructor(private http: HttpClient) {}

  /** Public – GET active story items */
  getStories(): Observable<StoryListResponse> {
    return this.http.get<StoryListResponse>(API_BASE);
  }
}
