import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { ReturnPolicyRoutingModule } from './return-policy-routing.module';
import { ReturnPolicyComponent } from './return-policy.component';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  declarations: [ReturnPolicyComponent],
  imports: [
    CommonModule,
    TranslateModule,
    ReturnPolicyRoutingModule,
    SharedModule,
  ],
})
export class ReturnPolicyModule {}
