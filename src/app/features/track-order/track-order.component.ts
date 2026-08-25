import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  OnInit,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateService } from '@ngx-translate/core';
import { OrderTrackingService } from './order-tracking.service';
import { TrackingData } from '../../core/models/order.model';
import { LanguageService } from '../../core/services/language.service';

@Component({
  selector: 'app-track-order',
  templateUrl: './track-order.component.html',
  styleUrls: ['./track-order.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrackOrderComponent implements OnInit {
  trackingData: TrackingData | null = null;
  isLoading = true;
  errorMessage: string | null = null;

  readonly steps: ReadonlyArray<{ key: string }> = [
    { key: 'TRACKING.STEP_SUBMITTED' },
    { key: 'TRACKING.STEP_PROCESSING' },
    { key: 'TRACKING.STEP_SHIPPED' },
    { key: 'TRACKING.STEP_DELIVERED' },
  ];

  private readonly statusStepMap: Readonly<Record<string, number>> = {
    pending: 0,
    processing: 1,
    shipped: 2,
    delivered: 3,
    cancelled: -1,
  };

  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly trackingService = inject(OrderTrackingService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly translate = inject(TranslateService);
  readonly languageService = inject(LanguageService);

  ngOnInit(): void {
    this.route.queryParams
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const orderNumber = params['id'] as string | undefined;
        const token = params['token'] as string | undefined;

        if (orderNumber && token) {
          this.trackingService.saveToStorage(orderNumber, token);
          this.fetchTracking(orderNumber, token);
        } else {
          const stored = this.trackingService.getFromStorage();
          if (stored) {
            this.fetchTracking(stored.orderNumber, stored.trackingToken);
          } else {
            this.isLoading = false;
            this.errorMessage = this.translate.instant('TRACKING.NOT_FOUND_MSG');
            this.cdr.markForCheck();
          }
        }
      });
  }

  get currentStep(): number {
    return this.statusStepMap[this.trackingData?.orderStatus ?? 'pending'] ?? 0;
  }

  get isCancelled(): boolean {
    return this.trackingData?.orderStatus === 'cancelled';
  }

  private fetchTracking(orderNumber: string, token: string): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.cdr.markForCheck();

    this.trackingService
      .getTrackingData(orderNumber, token)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.trackingData = data;
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: (err: Error) => {
          this.errorMessage = err.message || this.translate.instant('TRACKING.NOT_FOUND_MSG');
          this.isLoading = false;
          if (err.message?.includes('غير صالح') || err.message?.includes('منتهي') || err.message?.includes('invalid')) {
            this.trackingService.clearStorage();
          }
          this.cdr.markForCheck();
        },
      });
  }

  trackByIndex(index: number): number {
    return index;
  }

  trackByItemName(index: number, item: { name: string }): string {
    return item.name;
  }
}
