import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LanguageService } from './core/services/language.service';

/**
 * Application root component.
 * Initializes LanguageService which sets dir (rtl/ltr) and lang on document.documentElement.
 * Renders persistent layout (announcement bar, header, footer) and the router outlet.
 */
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  readonly title = 'Vitatrex';
  readonly languageService = inject(LanguageService);
}
