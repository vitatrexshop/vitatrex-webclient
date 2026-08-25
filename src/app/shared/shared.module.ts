import { NgModule } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { HeaderComponent } from './components/header/header.component';
import { FooterComponent } from './components/footer/footer.component';
import { AnnouncementBarComponent } from './components/announcement-bar/announcement-bar.component';
import { ProductCardComponent } from './components/product-card/product-card.component';
import { OfferCardComponent } from './components/offer-card/offer-card.component';
import { CartDrawerComponent } from './components/cart-drawer/cart-drawer.component';
import { LoadingSpinnerComponent } from './components/loading-spinner/loading-spinner.component';
import { BadgeComponent } from './components/badge/badge.component';
import { ToastComponent } from './components/toast/toast.component';
import { MarqueeBarComponent } from './components/marquee-bar/marquee-bar.component';
import { MobileBottomNavComponent } from './components/mobile-bottom-nav/mobile-bottom-nav.component';
import { HighlightPipe } from './pipes/highlight.pipe';

const SHARED_COMPONENTS = [
  HeaderComponent,
  FooterComponent,
  AnnouncementBarComponent,
  ProductCardComponent,
  OfferCardComponent,
  CartDrawerComponent,
  LoadingSpinnerComponent,
  BadgeComponent,
  ToastComponent,
  MarqueeBarComponent,
  MobileBottomNavComponent,
  HighlightPipe,
];

/**
 * SharedModule — barrel exports all shared components, pipes, and re-exports common utilities.
 * Imports NgOptimizedImage for highly optimized image rendering.
 * Re-exports TranslateModule so all feature modules get the translate pipe automatically.
 */
@NgModule({
  declarations: SHARED_COMPONENTS,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    NgOptimizedImage,
    TranslateModule,
  ],
  exports: [
    ...SHARED_COMPONENTS,
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    NgOptimizedImage,
    TranslateModule,
  ],
})
export class SharedModule {}
