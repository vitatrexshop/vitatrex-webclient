import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
} from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * Attaches standard request headers to every outgoing HTTP call:
 *   • Content-Type: application/json
 *   • Accept-Language: ar   (signals the backend to return Arabic messages)
 *
 * Skips requests that already have a Content-Type header set
 * (e.g. multipart/form-data file uploads must not be overridden).
 */
@Injectable()
export class ApiHeaderInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Only attach Content-Type when it hasn't been explicitly set by the caller
    const hasContentType = req.headers.has('Content-Type');

    const cloned = req.clone({
      setHeaders: {
        ...(hasContentType ? {} : { 'Content-Type': 'application/json' }),
        'Accept-Language': 'ar',
      },
    });

    return next.handle(cloned);
  }
}
