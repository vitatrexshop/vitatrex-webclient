import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';

const CONSENT_KEY = 'cookieConsent';

/**
 * Cookie Consent Banner
 *
 * Shown once on first visit. On accept:
 *  - saves 'accepted' to localStorage under 'cookieConsent'
 *  - updates GA4 Consent Mode to 'granted' for analytics_storage & ad_storage
 *  - dismisses the banner (hidden forever for returning visitors)
 *
 * The GA4 gtag script in index.html already fires with send_page_view=false,
 * so no data is sent until the user grants consent here.
 */
@Component({
  selector: 'app-cookie-consent',
  templateUrl: './cookie-consent.component.html',
  styleUrls: ['./cookie-consent.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CookieConsentComponent implements OnInit {
  isVisible = false;

  private readonly cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    // Only show the banner if the user hasn't consented yet
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(CONSENT_KEY);
      if (!saved) {
        // Slight delay so the banner slides in after the page settles
        setTimeout(() => {
          this.isVisible = true;
          this.cdr.markForCheck();
        }, 1200);
      }
    }
  }

  accept(): void {
    localStorage.setItem(CONSENT_KEY, 'accepted');
    this.isVisible = false;

    // ── GA4 Consent Mode: grant analytics + ad storage ──────────────────────
    // This signals Google's consent framework that the user has consented.
    // GA4 will now send the queued/future hits that were held back.
    if (typeof window !== 'undefined' && typeof (window as any).gtag === 'function') {
      (window as any).gtag('consent', 'update', {
        analytics_storage: 'granted',
        ad_storage: 'granted',
        ad_user_data: 'granted',
        ad_personalization: 'granted',
      });
    }

    this.cdr.markForCheck();
  }
}
