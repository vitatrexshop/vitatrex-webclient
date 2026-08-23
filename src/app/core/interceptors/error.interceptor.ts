import { Injectable, isDevMode } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ToastService } from '../services/toast.service';
import { ApiErrorResponse } from '../models/api-response.model';

/**
 * Maps HTTP status codes to user-friendly Arabic error messages.
 * Prevents raw server stack traces from leaking to the browser console in production.
 */
const ERROR_MESSAGES: Record<number, string> = {
  400: 'طلب غير صحيح، يرجى التحقق من البيانات المُدخلة',
  401: 'غير مصرح لك بالوصول، يرجى تسجيل الدخول',
  403: 'ليس لديك صلاحية للقيام بهذا الإجراء',
  404: 'العنصر المطلوب غير موجود',
  409: 'تعارض في البيانات، يرجى المراجعة',
  422: 'بيانات غير صالحة، يرجى التحقق من الحقول',
  429: 'طلبات كثيرة جداً، يرجى الانتظار قليلاً',
  500: 'حدث خطأ في الخادم، يرجى المحاولة لاحقاً',
  502: 'الخادم غير متاح حالياً، يرجى المحاولة لاحقاً',
  503: 'الخدمة متوقفة مؤقتاً، يرجى المحاولة لاحقاً',
};

const DEFAULT_ERROR_MESSAGE = 'حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(private readonly toastService: ToastService) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        const message = this.resolveMessage(error);
        this.toastService.show(message, 'error');

        // In production, suppress raw technical details from the console
        if (isDevMode()) {
          console.error('[ErrorInterceptor]', error);
        }

        return throwError(() => error);
      })
    );
  }

  private resolveMessage(error: HttpErrorResponse): string {
    // Prefer the Arabic message from the backend error envelope
    const body = error.error as ApiErrorResponse | null;

    if (body?.message) {
      // If there are field-level validation errors, append the first one
      if (body.errors?.length) {
        const firstFieldError = body.errors[0].message;
        return `${body.message}: ${firstFieldError}`;
      }
      return body.message;
    }

    return ERROR_MESSAGES[error.status] ?? DEFAULT_ERROR_MESSAGE;
  }
}
