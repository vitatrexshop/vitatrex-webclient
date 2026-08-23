import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Sticky top announcement ticker — pure CSS marquee, no JS timers, no memory leaks.
 * Content is duplicated in template for seamless infinite loop.
 */
@Component({
  selector: 'app-announcement-bar',
  templateUrl: './announcement-bar.component.html',
  styleUrls: ['./announcement-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnnouncementBarComponent {}
