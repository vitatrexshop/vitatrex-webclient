import { ChangeDetectionStrategy, Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Toast, ToastService } from '../../../core/services/toast.service';

/**
 * Global toast notification overlay.
 * Renders stacked toasts driven by ToastService.
 * Uses takeUntil + Subject for Angular 16-compatible memory-safe subscription.
 */
@Component({
  selector: 'app-toast',
  templateUrl: './toast.component.html',
  styleUrls: ['./toast.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastComponent implements OnInit, OnDestroy {
  toasts: Toast[] = [];

  private readonly destroy$ = new Subject<void>();

  constructor(private readonly toastService: ToastService) {}

  ngOnInit(): void {
    this.toastService.toasts$
      .pipe(takeUntil(this.destroy$))
      .subscribe((toasts) => {
        this.toasts = toasts;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  dismiss(id: string): void {
    this.toastService.dismiss(id);
  }

  trackById(_: number, toast: Toast): string {
    return toast.id;
  }
}
