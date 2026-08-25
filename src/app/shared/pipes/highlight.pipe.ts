import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'highlight',
})
export class HighlightPipe implements PipeTransform {
  constructor(private readonly sanitizer: DomSanitizer) {}

  transform(value: string | null | undefined, search: string | null | undefined): SafeHtml {
    if (!value) return '';
    if (!search || !search.trim()) return value;

    const trimmed = search.trim();
    const escaped = trimmed.replace(/[.*+?^${'()|[\]\\]/g, '\\$&');
    const regex = new RegExp('(' + escaped + ')', 'gi');
    const highlighted = value.replace(regex, '<mark class="search-kw-match">$1</mark>');

    return this.sanitizer.bypassSecurityTrustHtml(highlighted);
  }
}
