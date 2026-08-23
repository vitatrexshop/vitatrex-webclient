import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';
import { QuizAnswers, QuizRecommendation } from '../models/quiz.model';

const QUIZ_API = '/api/v1/quiz';

/**
 * Submits user health survey answers and retrieves a product recommendation.
 * Route: POST /api/v1/quiz (public — no auth required)
 */
@Injectable({ providedIn: 'root' })
export class QuizService {
  constructor(private readonly api: ApiService) {}

  /**
   * Post the collected quiz answers and receive a recommended product ID.
   */
  submitQuiz(answers: QuizAnswers): Observable<QuizRecommendation> {
    return this.api.post<QuizRecommendation>(QUIZ_API, { answers }).pipe(
      map((res) => res.data as QuizRecommendation)
    );
  }
}
