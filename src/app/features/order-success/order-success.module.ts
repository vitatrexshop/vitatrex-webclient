import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrderSuccessRoutingModule } from './order-success-routing.module';
import { OrderSuccessComponent } from './order-success.component';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  declarations: [OrderSuccessComponent],
  imports: [CommonModule, OrderSuccessRoutingModule, SharedModule],
})
export class OrderSuccessModule {}
