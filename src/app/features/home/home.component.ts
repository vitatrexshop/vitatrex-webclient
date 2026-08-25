import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
} from '@angular/core';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent implements AfterViewInit {
  ngAfterViewInit(): void {
    document.querySelectorAll<HTMLElement>('.vt-section, .vt-reveal').forEach((el) => {
      el.classList.add('vt-revealed');
    });
  }
}
