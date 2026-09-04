import { Component, OnInit, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-terms-conditions',
  templateUrl: './terms-conditions.component.html',
  styleUrls: ['./terms-conditions.component.scss'],
})
export class TermsConditionsComponent implements OnInit {
  private readonly titleService = inject(Title);
  readonly translate = inject(TranslateService);

  readonly emailAddress = 'vitatrexshop@gmail.com';

  ngOnInit(): void {
    this.updateTitle();
    this.translate.onLangChange.subscribe(() => {
      this.updateTitle();
    });
  }

  private updateTitle(): void {
    this.translate.get('TERMS_CONDITIONS.PAGE_TITLE').subscribe((title: string) => {
      this.titleService.setTitle(title || 'الشروط والأحكام | فيتاتريكس');
    });
  }
}
