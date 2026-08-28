import { Component, OnInit, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-return-policy',
  templateUrl: './return-policy.component.html',
  styleUrls: ['./return-policy.component.scss'],
})
export class ReturnPolicyComponent implements OnInit {
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
    this.translate.get('RETURN_POLICY.PAGE_TITLE').subscribe((title: string) => {
      this.titleService.setTitle(title || 'سياسة الإرجاع والاستبدال | فيتاتريكس');
    });
  }
}
