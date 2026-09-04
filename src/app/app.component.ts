import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { LanguageService } from './core/services/language.service';
import { AnalyticsService } from './core/services/analytics.service';

/**
 * Application root component.
 * Initializes LanguageService which sets dir (rtl/ltr) and lang on document.documentElement.
 * Renders persistent layout (announcement bar, header, footer) and the router outlet.
 *
 * Also subscribes to Angular Router NavigationEnd events to send GA4 page_view
 * hits on every route change — required for Single Page Applications where the
 * browser does not natively fire a new page load on navigation.
 */
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit {
  readonly title = 'Vitatrex';

  private readonly languageService = inject(LanguageService);
  private readonly router = inject(Router);
  private readonly analytics = inject(AnalyticsService);

  ngOnInit(): void {
    // ── GA4 Router Page-View Tracking ──────────────────────────────────────
    // SPA apps don't trigger native browser page loads on route transitions,
    // so we listen to NavigationEnd and manually fire GA4 page_view events.
    // The initial page_view is handled here too (first NavigationEnd fires
    // synchronously on app bootstrap when the router resolves the initial URL).
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event) => {
        const navEnd = event as NavigationEnd;
        // Use urlAfterRedirects so redirects are tracked as the final destination
        this.analytics.trackPageView(navEnd.urlAfterRedirects, document.title);
      });
  }
}
