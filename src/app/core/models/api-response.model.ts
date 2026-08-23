/**
 * Generic API response envelope matching the Vitatrix backend standard.
 * All successful responses wrap data inside this shape.
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

/** A single field-level validation error returned from the backend */
export interface ApiError {
  field?: string;
  message: string;
}

/** The shape of error responses (4xx / 5xx) */
export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: ApiError[];
}
