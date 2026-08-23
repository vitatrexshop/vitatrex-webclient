import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

/**
 * Controls the open/close state of the slide-over cart drawer.
 * Consumed by HeaderComponent (trigger) and CartDrawerComponent (renderer).
 */
@Injectable({ providedIn: 'root' })
export class CartDrawerService {
  private readonly _isOpen$ = new BehaviorSubject<boolean>(false);
  readonly isOpen$ = this._isOpen$.asObservable();

  open(): void   { this._isOpen$.next(true); }
  close(): void  { this._isOpen$.next(false); }
  toggle(): void { this._isOpen$.next(!this._isOpen$.value); }
}
