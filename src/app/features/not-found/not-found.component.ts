import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-not-found',
  templateUrl: './not-found.component.html',
  styleUrls: ['./not-found.component.scss'],
})
export class NotFoundComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly titleService = inject(Title);
  private readonly translate = inject(TranslateService);

  searchQuery = '';

  quickCards = [
    {
      icon: 'shopping-bag',
      titleKey: 'NOT_FOUND.CARDS.SHOP_TITLE',
      descKey: 'NOT_FOUND.CARDS.SHOP_DESC',
      route: '/shop',
      badge: 'EXPLORE',
      colorClass: 'card--shop',
    },
    {
      icon: 'sparkles',
      titleKey: 'NOT_FOUND.CARDS.QUIZ_TITLE',
      descKey: 'NOT_FOUND.CARDS.QUIZ_DESC',
      route: '/quiz',
      badge: 'FREE',
      colorClass: 'card--quiz',
    },
    {
      icon: 'truck',
      titleKey: 'NOT_FOUND.CARDS.TRACK_TITLE',
      descKey: 'NOT_FOUND.CARDS.TRACK_DESC',
      route: '/track',
      badge: 'LIVE',
      colorClass: 'card--track',
    },
    {
      icon: 'tag',
      titleKey: 'NOT_FOUND.CARDS.OFFERS_TITLE',
      descKey: 'NOT_FOUND.CARDS.OFFERS_DESC',
      route: '/shop',
      badge: 'HOT',
      colorClass: 'card--offers',
    },
  ];

  ngOnInit(): void {
    this.updateTitle();
    this.translate.onLangChange.subscribe(() => {
      this.updateTitle();
    });
  }

  private updateTitle(): void {
    this.translate.get('NOT_FOUND.PAGE_TITLE').subscribe((title: string) => {
      this.titleService.setTitle(title || '404 - VitaTrex');
    });
  }

  onSearch(): void {
    const q = this.searchQuery.trim();
    if (q) {
      this.router.navigate(['/shop'], { queryParams: { q } });
    } else {
      this.router.navigate(['/shop']);
    }
  }

  navigate(route: string): void {
    this.router.navigate([route]);
  }
}
