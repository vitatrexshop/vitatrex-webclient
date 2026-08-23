import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuizRoutingModule } from './quiz-routing.module';
import { QuizComponent } from './quiz.component';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  declarations: [QuizComponent],
  imports: [CommonModule, QuizRoutingModule, SharedModule],
})
export class QuizModule {}
