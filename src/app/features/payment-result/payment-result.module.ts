import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { PaymentResultComponent } from './payment-result.component';

const routes: Routes = [
  {
    path: 'success',
    component: PaymentResultComponent,
    data: { resultType: 'success' },
    title: 'تم الدفع بنجاح - Vitatrix'
  },
  {
    path: 'failed',
    component: PaymentResultComponent,
    data: { resultType: 'failed' },
    title: 'فشل الدفع - Vitatrix'
  }
];

@NgModule({
  declarations: [PaymentResultComponent],
  imports: [CommonModule, RouterModule.forChild(routes)],
  exports: [PaymentResultComponent]
})
export class PaymentResultModule {}
