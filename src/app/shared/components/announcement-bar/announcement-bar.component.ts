import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Observable } from 'rxjs';
import { SettingsService } from '../../../core/services/settings.service';
import { ShippingSettings } from '../../../core/models/settings.model';

/**
 * Sticky top announcement ticker — pure CSS marquee, no JS timers, no memory leaks.
 * Content is duplicated in template for seamless infinite loop.
 */
@Component({
  selector: 'app-announcement-bar',
  templateUrl: './announcement-bar.component.html',
  styleUrls: ['./announcement-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnnouncementBarComponent {
  readonly shippingSettings$: Observable<ShippingSettings>;

  constructor(private readonly settingsService: SettingsService) {
    this.shippingSettings$ = this.settingsService.getShippingSettings();
  }
}

