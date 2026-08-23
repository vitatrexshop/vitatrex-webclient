import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HomeRoutingModule } from './home-routing.module';
import { HomeComponent } from './home.component';
import { SharedModule } from '../../shared/shared.module';

import { HeroSliderComponent } from './components/hero-slider/hero-slider.component';
import { FeaturesBarComponent } from './components/features-bar/features-bar.component';
import { ProductsSectionComponent } from './components/products-section/products-section.component';
import { OffersSectionComponent } from './components/offers-section/offers-section.component';
import { FeaturedBannerComponent } from './components/featured-banner/featured-banner.component';
import { QuizCtaComponent } from './components/quiz-cta/quiz-cta.component';
import { FlavorSwitcherComponent } from './components/flavor-switcher/flavor-switcher.component';
import { PromoVideoComponent } from './components/promo-video/promo-video.component';
import { VideoStoriesComponent } from './components/video-stories/video-stories.component';
import { BundleCardComponent } from './components/bundle-card/bundle-card.component';

@NgModule({
  declarations: [
    HomeComponent,
    HeroSliderComponent,
    PromoVideoComponent,
    OffersSectionComponent,
    VideoStoriesComponent,
    FeaturesBarComponent,
    ProductsSectionComponent,
    QuizCtaComponent,
    FeaturedBannerComponent,
    FlavorSwitcherComponent,
    BundleCardComponent,
  ],
  imports: [CommonModule, HomeRoutingModule, SharedModule],
})
export class HomeModule {}

