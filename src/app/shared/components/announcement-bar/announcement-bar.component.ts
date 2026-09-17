import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
  PLATFORM_ID,
  inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable } from 'rxjs';
import { SettingsService } from '../../../core/services/settings.service';
import { ShippingSettings } from '../../../core/models/settings.model';

/**
 * Sticky top announcement ticker — pure CSS marquee, zero JS timers, zero memory leaks.
 *
 * Layout strategy:
 *   Two identical `.announcement-bar__group` elements sit side-by-side inside
 *   `.announcement-bar__track` (width: max-content, display: flex).
 *   The keyframe scrolls from translateX(0) to translateX(-50%), so when the
 *   first group exits the left edge the second group is perfectly aligned,
 *   creating a seamless, gap-free infinite loop at 60fps (GPU compositor only).
 *
 * @Input speed       — animation duration in seconds (default 28). Lower = faster.
 * @Input isRtl       — when true, reverses animation direction for RTL locales.
 */
@Component({
  selector: 'app-announcement-bar',
  templateUrl: './announcement-bar.component.html',
  styleUrls: ['./announcement-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnnouncementBarComponent implements OnInit {
  private readonly settingsService = inject(SettingsService);
  private readonly platformId      = inject(PLATFORM_ID);

  /** Animation duration in seconds — lower value = faster scroll. Default: 28s */
  @Input() speed = 28;

  /**
   * Override scroll direction.
   * true  → animation plays in reverse (text flows right-to-left in LTR terms,
   *          which is physically left-to-right — standard for Arabic RTL layouts).
   * false → standard left-to-right scroll (default for LTR sites).
   *
   * When not set, the component auto-detects the document dir attribute.
   */
  @Input() isRtl: boolean | null = null;

  readonly shippingSettings$: Observable<ShippingSettings> =
    this.settingsService.getShippingSettings();

  ngOnInit(): void {
    // Auto-detect RTL from the document direction when @Input is not explicitly set
    if (this.isRtl === null && isPlatformBrowser(this.platformId)) {
      const docDir = document.documentElement.getAttribute('dir') || 'ltr';
      this.isRtl = docDir === 'rtl';
    }
  }
}
