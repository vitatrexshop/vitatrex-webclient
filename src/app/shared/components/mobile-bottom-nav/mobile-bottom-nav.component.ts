import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  inject,
} from '@angular/core';
import { FormControl } from '@angular/forms';
import { NavigationEnd, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { filter, map, startWith } from 'rxjs/operators';
import { CartService } from '../../../core/services/cart.service';
import { CartDrawerService } from '../../../core/services/cart-drawer.service';

@Component({
  selector: 'app-mobile-bottom-nav',
  templateUrl: './mobile-bottom-nav.component.html',
  styleUrls: ['./mobile-bottom-nav.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MobileBottomNavComponent {
  private readonly cartService = inject(CartService);
  private readonly cartDrawerService = inject(CartDrawerService);
  private readonly router = inject(Router);

  @ViewChild('searchInput') searchInputRef?: ElementRef<HTMLInputElement>;

  readonly itemCount$: Observable<number> = this.cartService.itemCount$;
  readonly isCartDrawerOpen$: Observable<boolean> = this.cartDrawerService.isOpen$;

  readonly isCheckoutPage$: Observable<boolean> = this.router.events.pipe(
    filter((event): event is NavigationEnd => event instanceof NavigationEnd),
    map((event) => event.urlAfterRedirects.includes('/checkout') || event.urlAfterRedirects.includes('/order-success')),
    startWith(this.router.url.includes('/checkout') || this.router.url.includes('/order-success'))
  );

  isSearchOpen = false;
  readonly searchControl = new FormControl('', { nonNullable: true });

  openCart(): void {
    this.isSearchOpen = false;
    this.cartDrawerService.open();
  }

  toggleSearch(): void {
    this.isSearchOpen = !this.isSearchOpen;
    if (this.isSearchOpen) {
      setTimeout(() => {
        this.searchInputRef?.nativeElement?.focus();
      }, 100);
    }
  }

  closeSearch(): void {
    this.isSearchOpen = false;
  }

  submitSearch(): void {
    const query = this.searchControl.value.trim();
    this.router.navigate(['/shop'], query ? { queryParams: { q: query } } : {});
    this.searchControl.reset();
    this.isSearchOpen = false;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isSearchOpen) {
      this.closeSearch();
    }
  }
}
