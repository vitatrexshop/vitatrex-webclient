import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-features-bar',
  templateUrl: './features-bar.component.html',
  styleUrls: ['./features-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeaturesBarComponent {
  readonly features = [
    {
      type: 'natural',
      titleKey: 'FEATURES.NATURAL_TITLE',
      descKey: 'FEATURES.NATURAL_DESC',
    },
    {
      type: 'sugar_free',
      titleKey: 'FEATURES.NO_SUGAR_TITLE',
      descKey: 'FEATURES.NO_SUGAR_DESC',
    },
    {
      type: 'quality',
      titleKey: 'FEATURES.QUALITY_TITLE',
      descKey: 'FEATURES.QUALITY_DESC',
    },
    {
      type: 'shipping',
      titleKey: 'FEATURES.SHIPPING_TITLE',
      descKey: 'FEATURES.SHIPPING_DESC',
    },
  ];
}
