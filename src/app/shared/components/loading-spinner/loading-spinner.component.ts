import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Observable } from 'rxjs';
import { LoadingService } from '../../../core/services/loading.service';

/**
 * Global top progress bar that appears when any HTTP request is in-flight.
 * Bound to LoadingService.isLoading$ — fully driven by the LoadingInterceptor.
 */
@Component({
  selector: 'app-loading-spinner',
  templateUrl: './loading-spinner.component.html',
  styleUrls: ['./loading-spinner.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadingSpinnerComponent {
  readonly isLoading$: Observable<boolean>;

  constructor(private readonly loadingService: LoadingService) {
    this.isLoading$ = this.loadingService.isLoading$;
  }
}
