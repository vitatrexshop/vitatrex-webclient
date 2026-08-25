import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { gsap } from 'gsap';

@Injectable({ providedIn: 'root' })
export class FlyToCartService {
  constructor(@Inject(PLATFORM_ID) private readonly platformId: object) {}

  /**
   * Triggers a parabolic fly animation of a dynamic gummy/badge particle
   * starting from mouse click coordinates to the header cart button.
   */
  fly(event: MouseEvent, iconOrEmoji?: string): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // Find the cart icon in the header
    const targetEl = document.querySelector('.header-cart-btn') as HTMLElement;
    if (!targetEl) return;

    const targetRect = targetEl.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;

    // Create the particle element
    const particle = document.createElement('div');
    particle.className = 'fly-cart-particle';
    if (iconOrEmoji) {
      particle.textContent = iconOrEmoji;
    } else {
      particle.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
    }
    
    // Style the particle (position fixed to match clientX/clientY coords)
    Object.assign(particle.style, {
      position: 'fixed',
      left: '0px',
      top: '0px',
      width: '32px',
      height: '32px',
      borderRadius: '50%',
      background: 'radial-gradient(circle, var(--color-brand-400) 0%, var(--color-brand-600) 100%)',
      boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '1.2rem',
      zIndex: '99999',
      pointerEvents: 'none',
      transform: `translate3d(${startX - 16}px, ${startY - 16}px, 0px)`,
    });

    document.body.appendChild(particle);

    // Target center coordinates
    const endX = targetRect.left + targetRect.width / 2 - 16;
    const endY = targetRect.top + targetRect.height / 2 - 16;

    // Parabolic Bezier simulation: Animate X and Y separately
    const tl = gsap.timeline({
      onComplete: () => {
        particle.remove();
        // Dynamic jiggle animation on header cart button
        gsap.fromTo(targetEl,
          { scale: 1 },
          { scale: 1.35, duration: 0.12, yoyo: true, repeat: 1, ease: 'power2.out' }
        );
      }
    });

    const midY = Math.min(startY, endY) - 80;

    // Rotate and scale down the particle
    tl.to(particle, {
      scale: 0.4,
      rotation: 720,
      duration: 0.85,
      ease: 'power2.inOut',
    }, 0);

    // Animate X (horizontal) motion
    tl.to(particle, {
      x: endX,
      duration: 0.85,
      ease: 'power2.out',
    }, 0);

    // Animate Y (vertical) motion (arc up then down)
    tl.to(particle, {
      y: midY,
      duration: 0.35,
      ease: 'power1.out',
    }, 0);

    tl.to(particle, {
      y: endY,
      duration: 0.5,
      ease: 'power2.in',
    }, 0.35);
  }
}
