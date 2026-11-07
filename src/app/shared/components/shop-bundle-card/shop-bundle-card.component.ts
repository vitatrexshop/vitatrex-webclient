import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { Bundle } from '../../../core/models/bundle.model';
import { environment } from '../../../../environments/environment';

/**
 * ShopBundleCardComponent — Displays "اصنع باقتك" bundle cards inside the shop grid.
 * Matches the 360 Nutrition / Vitatrix product card aspect ratio and luxury aesthetics.
 */
@Component({
  selector: 'app-shop-bundle-card',
  templateUrl: './shop-bundle-card.component.html',
  styleUrls: ['./shop-bundle-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShopBundleCardComponent {
  @Input() bundle!: Bundle;
  @Output() buildBundle = new EventEmitter<Bundle>();

  get paidCount(): number {
    return this.bundle?.paidProducts?.length ?? 0;
  }

  get giftCount(): number {
    return this.bundle?.giftProducts?.length ?? 0;
  }

  onCardClick(): void {
    if (this.bundle) {
      this.buildBundle.emit(this.bundle);
    }
  }

  onCtaClick(event: Event): void {
    event.stopPropagation();
    if (this.bundle) {
      this.buildBundle.emit(this.bundle);
    }
  }

  formatMediaUrl(url?: string): string {
    if (!url) return 'assets/images/hero-fallback.webp';
    const raw = url.trim();
    if (raw.startsWith('http') || raw.startsWith('blob:') || raw.startsWith('assets/')) return raw;
    if (raw.startsWith('/uploads')) return `${environment.mediaBaseUrl}${raw}`;
    if (raw.startsWith('uploads'))  return `${environment.mediaBaseUrl}/${raw}`;
    return raw;
  }
}

