import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { LoadingService } from '../services/loading.service';

/**
 * Tracks in-flight HTTP requests.
 * Increments the LoadingService counter before each request and
 * decrements it in finalize() — which fires on success, error, AND cancellation.
 */
@Injectable()
export class LoadingInterceptor implements HttpInterceptor {
  constructor(private readonly loadingService: LoadingService) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    this.loadingService.increment();
    return next.handle(req).pipe(
      finalize(() => this.loadingService.decrement())
    );
  }
}
