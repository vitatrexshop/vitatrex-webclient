import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-payment-result',
  templateUrl: './payment-result.component.html',
  styleUrls: ['./payment-result.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentResultComponent implements OnInit {
  resultType: 'success' | 'failed' = 'success';
  orderNumber = '';
  transactionId = '';
  status = '';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.resultType = this.route.snapshot.data['resultType'] ?? 'success';

    const qp = this.route.snapshot.queryParams;
    this.orderNumber = qp['orderReference'] || qp['orderId'] || qp['merchantOrderId'] || '';
    this.transactionId = qp['transactionId'] || qp['kashierTxnId'] || '';
    this.status = qp['orderStatus'] || (this.resultType === 'success' ? 'SUCCESS' : 'FAILED');

    this.cdr.markForCheck();
  }

  trackOrder(): void {
    if (this.orderNumber) {
      this.router.navigate(['/order-success', this.orderNumber]);
    } else {
      this.router.navigate(['/track-order']);
    }
  }

  retryCheckout(): void {
    this.router.navigate(['/checkout']);
  }

  goToShop(): void {
    this.router.navigate(['/shop']);
  }
}
