import { ApiResponse } from './api-response.model';

/**
 * Flexible key-value map for quiz answers.
 * Keys are question identifiers (e.g. 'age', 'gender', 'goals', 'diet').
 */
export interface QuizAnswers {
  [questionKey: string]: any;
}

/**
 * The server-side result of a submitted health quiz.
 * Returned by POST /api/v1/quiz.
 */
export interface QuizRecommendation {
  _id: string;
  answers: QuizAnswers;
  /** ID of the recommended product, or null if no match found */
  recommendedProduct: string | null;
  convertedToOrder: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * A single step / question in the interactive quiz UI.
 * Not stored on the backend — used purely for frontend rendering.
 */
export interface QuizQuestion {
  key: string;
  label: string;
  type: 'single' | 'multi' | 'number';
  options?: { value: string; label: string }[];
}

export type QuizResponse = ApiResponse<QuizRecommendation>;
export type QuizListResponse = ApiResponse<QuizRecommendation[]>;
