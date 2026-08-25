import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterComponent {
  private readonly toastService = inject(ToastService);

  readonly currentYear = new Date().getFullYear();
  readonly emailControl = new FormControl('', [Validators.required, Validators.email]);
  isSubscribed = false;

  subscribeNewsletter(): void {
    if (this.emailControl.invalid) {
      this.emailControl.markAsTouched();
      this.toastService.error('يرجى إدخال بريد إلكتروني صحيح');
      return;
    }

    this.isSubscribed = true;
    this.toastService.success('شكراً لاشتراكك! ستصلك أحدث العروض والخصومات الحصرية');
    this.emailControl.reset();
  }

  openHelpModal(): void {
    window.open('https://wa.me/201000000000?text=مرحباً%20فيتاتريكس%20لدي%20استفسار', '_blank');
  }
}
