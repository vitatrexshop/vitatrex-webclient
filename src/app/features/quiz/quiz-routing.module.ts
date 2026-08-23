import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { QuizComponent } from './quiz.component';
import { QuizGuard } from '../../core/guards/quiz.guard';

const routes: Routes = [
  { path: '', component: QuizComponent, canActivate: [QuizGuard] },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class QuizRoutingModule {}
