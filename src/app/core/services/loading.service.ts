import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, distinctUntilChanged } from 'rxjs/operators';

/**
 * Tracks concurrent HTTP requests via a counter.
 * The LoadingInterceptor calls increment/decrement.
 * Components bind to isLoading$ for skeleton loaders or progress bars.
 */
@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly _activeRequests$ = new BehaviorSubject<number>(0);

  /** Emits true when one or more HTTP requests are in-flight */
  readonly isLoading$: Observable<boolean> = this._activeRequests$.pipe(
    map((count) => count > 0),
    distinctUntilChanged()
  );

  increment(): void {
    this._activeRequests$.next(this._activeRequests$.value + 1);
  }

  decrement(): void {
    const current = this._activeRequests$.value;
    this._activeRequests$.next(Math.max(0, current - 1));
  }
}
