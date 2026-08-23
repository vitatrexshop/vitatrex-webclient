import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Toast {
  id: string;
  message: string;
  type: 'error' | 'success' | 'info' | 'warning';
}

/**
 * Lightweight toast notification service.
 * The ErrorInterceptor pushes Arabic error messages here.
 * The ToastComponent renders the active toasts.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly _toasts$ = new BehaviorSubject<Toast[]>([]);

  readonly toasts$: Observable<Toast[]> = this._toasts$.asObservable();

  show(message: string, type: Toast['type'] = 'error', duration = 4000): void {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const toast: Toast = { id, message, type };
    this._toasts$.next([...this._toasts$.value, toast]);

    setTimeout(() => this.dismiss(id), duration);
  }

  success(message: string, duration = 4000): void {
    this.show(message, 'success', duration);
  }

  error(message: string, duration = 4000): void {
    this.show(message, 'error', duration);
  }

  info(message: string, duration = 4000): void {
    this.show(message, 'info', duration);
  }

  warning(message: string, duration = 4000): void {
    this.show(message, 'warning', duration);
  }

  dismiss(id: string): void {
    this._toasts$.next(this._toasts$.value.filter((t) => t.id !== id));
  }

  clear(): void {
    this._toasts$.next([]);
  }
}
