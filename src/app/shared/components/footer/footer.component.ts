import {
  ChangeDetectionStrategy,
  Component,
  inject,
} from '@angular/core';
import { Observable } from 'rxjs';
import { LanguageService, LanguageCode } from '../../../core/services/language.service';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterComponent {
  private readonly languageService = inject(LanguageService);

  readonly currentYear = new Date().getFullYear();
  readonly currentLang$: Observable<LanguageCode> = this.languageService.currentLang$;

  isQuickLinksOpen = false;

  toggleQuickLinks(): void {
    this.isQuickLinksOpen = !this.isQuickLinksOpen;
  }

  toggleLanguage(): void {
    this.languageService.toggleLanguage();
  }
}
