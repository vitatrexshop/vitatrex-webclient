import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ReturnPolicyComponent } from './return-policy.component';

const routes: Routes = [
  {
    path: '',
    component: ReturnPolicyComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ReturnPolicyRoutingModule {}
