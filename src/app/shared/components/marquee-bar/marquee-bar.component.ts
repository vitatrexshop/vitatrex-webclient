import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  ChangeDetectionStrategy,
  PLATFORM_ID,
  Inject
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { gsap } from 'gsap';

/**
 * Continuous high-performance marquee ticker using GSAP.
 * Achieves sub-pixel 60fps rendering, bypassing standard CSS timer hiccups.
 */
@Component({
  selector: 'app-marquee-bar',
  templateUrl: './marquee-bar.component.html',
  styleUrls: ['./marquee-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarqueeBarComponent implements AfterViewInit, OnDestroy {
  @ViewChild('track', { static: true }) track!: ElementRef<HTMLDivElement>;
  private tween: gsap.core.Tween | null = null;

  constructor(@Inject(PLATFORM_ID) private readonly platformId: object) {}

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      // Loop the track elements seamlessly using 3D transforms
      this.tween = gsap.to(this.track.nativeElement, {
        xPercent: -50, // Shifts leftwards for seamless wrapping
        repeat: -1,
        duration: 18,
        ease: 'none',
      });
    }
  }

  ngOnDestroy(): void {
    if (this.tween) {
      this.tween.kill();
      this.tween = null;
    }
  }
}
