import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { CartService } from '../../../core/services/cart.service';
import { CartDrawerService } from '../../../core/services/cart-drawer.service';
import { LanguageService, LanguageCode } from '../../../core/services/language.service';

/**
 * Redesigned luxury glassmorphism header with multi-link navigation.
 * - Comprehensive links: Home, Shop/All Products, Offers & Bundles, Health Quiz, Track Order
 * - Scroll-aware frosted glass elevation
 * - Real-time reactive cart count badge with pulse animation
 * - Language switcher (Arabic / English)
 * - Expandable search capsule
 * - Interactive mobile navigation drawer with category shortcuts
 */
@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  private readonly cartService = inject(CartService);
  private readonly cartDrawerService = inject(CartDrawerService);
  private readonly languageService = inject(LanguageService);
  private readonly router = inject(Router);

  readonly itemCount$: Observable<number> = this.cartService.itemCount$;
  readonly currentLang$: Observable<LanguageCode> = this.languageService.currentLang$;

  readonly isScrolled = signal(false);
  isMenuOpen = false;
  isSearchOpen = false;
  readonly searchControl = new FormControl('', { nonNullable: true });

  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    if (typeof window !== 'undefined') {
      this.isScrolled.set(window.scrollY > 24);
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (this.isMenuOpen && !target.closest('.site-header-wrapper')) {
      this.closeMenu();
    }
  }

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
    if (this.isMenuOpen) {
      this.isSearchOpen = false;
    }
  }

  closeMenu(): void {
    this.isMenuOpen = false;
  }

  toggleSearch(): void {
    this.isSearchOpen = !this.isSearchOpen;
  }

  openCart(): void {
    this.cartDrawerService.toggle();
  }

  switchLanguage(): void {
    this.languageService.toggleLanguage();
  }

  scrollToAbout(event?: Event): void {
    if (event) event.preventDefault();
    this.closeMenu();
    if (this.router.url === '/' || this.router.url === '') {
      const el = document.querySelector('.hero-manifesto-strip') || document.querySelector('.promo-video-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }
    this.router.navigate(['/']).then(() => {
      setTimeout(() => {
        const el = document.querySelector('.hero-manifesto-strip') || document.querySelector('.promo-video-section');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
    });
  }

  scrollToContact(event?: Event): void {
    if (event) event.preventDefault();
    this.closeMenu();
    const footer = document.querySelector('app-footer') || document.querySelector('footer');
    if (footer) {
      footer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  submitSearch(): void {
    const term = this.searchControl.value.trim();
    this.router.navigate(['/shop'], term ? { queryParams: { q: term } } : {});
    this.searchControl.reset();
    this.isSearchOpen = false;
    this.closeMenu();
  }
}
