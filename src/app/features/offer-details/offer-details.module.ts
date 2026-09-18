import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OfferDetailsRoutingModule } from './offer-details-routing.module';
import { OfferDetailsComponent } from './offer-details.component';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  declarations: [OfferDetailsComponent],
  imports: [CommonModule, OfferDetailsRoutingModule, SharedModule],
})
export class OfferDetailsModule {}
