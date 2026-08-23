import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { CartService } from '../services/cart.service';

/**
 * Prevents access to the /checkout route when the cart is empty.
 * Redirects to /shop so the user can add items first.
 */
@Injectable({ providedIn: 'root' })
export class CheckoutGuard implements CanActivate {
  constructor(
    private readonly cartService: CartService,
    private readonly router: Router
  ) {}

  canActivate(): Observable<boolean | UrlTree> {
    return this.cartService.itemCount$.pipe(
      take(1),
      map((count) => {
        if (count > 0) return true;
        return this.router.createUrlTree(['/shop']);
      })
    );
  }
}
