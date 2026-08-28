import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { ShippingPolicyRoutingModule } from './shipping-policy-routing.module';
import { ShippingPolicyComponent } from './shipping-policy.component';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  declarations: [ShippingPolicyComponent],
  imports: [
    CommonModule,
    TranslateModule,
    ShippingPolicyRoutingModule,
    SharedModule,
  ],
})
export class ShippingPolicyModule {}
