import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ShippingPolicyComponent } from './shipping-policy.component';

const routes: Routes = [
  {
    path: '',
    component: ShippingPolicyComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ShippingPolicyRoutingModule {}
