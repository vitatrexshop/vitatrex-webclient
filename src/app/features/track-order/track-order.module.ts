import { NgModule } from '@angular/core';
import { TrackOrderRoutingModule } from './track-order-routing.module';
import { TrackOrderComponent } from './track-order.component';
import { SharedModule } from '../../shared/shared.module';

// SharedModule already re-exports: CommonModule (NgIf, NgFor, DatePipe,
// TitleCasePipe, AsyncPipe), RouterModule, and ReactiveFormsModule.
// No additional imports are needed for this feature module.

@NgModule({
  declarations: [TrackOrderComponent],
  imports: [SharedModule, TrackOrderRoutingModule],
})
export class TrackOrderModule {}
