import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CheckoutComponent } from './checkout.component';
import { CheckoutGuard } from '../../core/guards/checkout.guard';

const routes: Routes = [
  { path: '', component: CheckoutComponent, canActivate: [CheckoutGuard] },
  { path: 'success/:orderNumber', redirectTo: '/order-success/:orderNumber' },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CheckoutRoutingModule {}
