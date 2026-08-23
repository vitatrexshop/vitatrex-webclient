import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { CheckoutRoutingModule } from './checkout-routing.module';
import { CheckoutComponent } from './checkout.component';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  declarations: [CheckoutComponent],
  imports: [CommonModule, ReactiveFormsModule, CheckoutRoutingModule, SharedModule],
})
export class CheckoutModule {}
