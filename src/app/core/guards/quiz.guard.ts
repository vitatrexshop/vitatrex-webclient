import { Injectable } from '@angular/core';
import { CanActivate } from '@angular/router';
import { Observable, of } from 'rxjs';

/**
 * Quiz access guard — allows access by default.
 * Extend this guard to prevent re-taking the quiz within the same session,
 * or to require a minimum cart state before accessing quiz results.
 */
@Injectable({ providedIn: 'root' })
export class QuizGuard implements CanActivate {
  canActivate(): Observable<boolean> {
    // Future: check sessionStorage for a completed quiz flag
    return of(true);
  }
}
