import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type LanguageCode = 'ar' | 'en';
export type Direction = 'rtl' | 'ltr';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly translate = inject(TranslateService);
  private readonly STORAGE_KEY = 'vt_lang';

  private readonly _currentLang$ = new BehaviorSubject<LanguageCode>('ar');
  readonly currentLang$: Observable<LanguageCode> = this._currentLang$.asObservable();

  private readonly _currentDir$ = new BehaviorSubject<Direction>('rtl');
  readonly currentDir$: Observable<Direction> = this._currentDir$.asObservable();

  get currentLang(): LanguageCode {
    return this._currentLang$.value;
  }

  get isRtl(): boolean {
    return this._currentLang$.value === 'ar';
  }

  constructor() {
    this.init();
  }

  /**
   * Initialize translation and load saved language preference from localStorage
   */
  private init(): void {
    this.translate.addLangs(['ar', 'en']);
    this.translate.setDefaultLang('ar');

    let savedLang: LanguageCode = 'ar';
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY) as LanguageCode | null;
      if (stored === 'ar' || stored === 'en') {
        savedLang = stored;
      }
    } catch {
      // Ignore in SSR / incognito
    }

    this.setLanguage(savedLang);
  }

  /**
   * Change the active language, update HTML attributes, and persist preference
   */
  setLanguage(lang: LanguageCode): void {
    this.translate.use(lang);
    this._currentLang$.next(lang);

    const dir: Direction = lang === 'ar' ? 'rtl' : 'ltr';
    this._currentDir$.next(dir);

    try {
      localStorage.setItem(this.STORAGE_KEY, lang);
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('lang', lang);
        document.body.setAttribute('dir', dir);
      }
    } catch {
      // Ignore
    }
  }

  /**
   * Toggle between Arabic and English
   */
  toggleLanguage(): void {
    const nextLang: LanguageCode = this.currentLang === 'ar' ? 'en' : 'ar';
    this.setLanguage(nextLang);
  }

  /**
   * Synchronously get a translation by key
   */
  instant(key: string, interpolateParams?: object): string {
    return this.translate.instant(key, interpolateParams);
  }
}
