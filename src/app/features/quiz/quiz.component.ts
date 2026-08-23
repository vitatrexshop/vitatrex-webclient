import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Interactive health quiz — multi-step survey with product recommendation.
 * UI implementation follows in a subsequent sprint.
 */
@Component({
  selector: 'app-quiz',
  templateUrl: './quiz.component.html',
  styleUrls: ['./quiz.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuizComponent {}
