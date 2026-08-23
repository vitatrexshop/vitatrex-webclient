import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/**
 * Reusable badge chip — discount %, "الأكثر مبيعاً", etc.
 */
@Component({
  selector: 'app-badge',
  templateUrl: './badge.component.html',
  styleUrls: ['./badge.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BadgeComponent {
  @Input() label = '';
  @Input() variant: 'discount' | 'bestseller' | 'featured' | 'new' = 'discount';
}
