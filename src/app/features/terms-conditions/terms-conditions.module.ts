import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { TermsConditionsRoutingModule } from './terms-conditions-routing.module';
import { TermsConditionsComponent } from './terms-conditions.component';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  declarations: [TermsConditionsComponent],
  imports: [
    CommonModule,
    TranslateModule,
    TermsConditionsRoutingModule,
    SharedModule,
  ],
})
export class TermsConditionsModule {}
