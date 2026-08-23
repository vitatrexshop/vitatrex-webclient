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
      icon: '🌿',
      titleKey: 'FEATURES.NATURAL_TITLE',
      descKey: 'FEATURES.NATURAL_DESC',
    },
    {
      icon: '🍏',
      titleKey: 'FEATURES.NO_SUGAR_TITLE',
      descKey: 'FEATURES.NO_SUGAR_DESC',
    },
    {
      icon: '🛡️',
      titleKey: 'FEATURES.QUALITY_TITLE',
      descKey: 'FEATURES.QUALITY_DESC',
    },
    {
      icon: '🚚',
      titleKey: 'FEATURES.SHIPPING_TITLE',
      descKey: 'FEATURES.SHIPPING_DESC',
    },
  ];
}
