import { Module } from '@nestjs/common';
import { AssignmentsModule } from '../assignments/assignments.module';
import { GradingModule } from '../grading/grading.module';
import { QuestionsModule } from '../questions/questions.module';
import { ExamTakingController } from './exam-taking.controller';
import { OwnershipGuard } from './ownership.guard';
import { SubmissionCloserService } from './submission-closer.service';
import { SubmissionsService } from './submissions.service';

@Module({
  imports: [AssignmentsModule, QuestionsModule, GradingModule],
  controllers: [ExamTakingController],
  providers: [SubmissionsService, OwnershipGuard, SubmissionCloserService],
})
export class SubmissionsModule {}
