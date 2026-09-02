import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-floating-whatsapp',
  templateUrl: './floating-whatsapp.component.html',
  styleUrls: ['./floating-whatsapp.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FloatingWhatsappComponent {
  readonly whatsappUrl = 'https://wa.me/201043674944';
}
