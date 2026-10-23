import { Body, Controller, Get, Param, ParseUUIDPipe, Patch } from '@nestjs/common';
import { AdminOnly } from '../common/decorators/admin-only.decorator';
import { GradeAnswerDto } from './dto/grade-answer.dto';
import { GradingService } from './grading.service';

@Controller()
@AdminOnly()
export class GradingController {
  constructor(private readonly grading: GradingService) {}

  @Get('exams/:id/submissions')
  listSubmissions(@Param('id', ParseUUIDPipe) examId: string) {
    return this.grading.listSubmissions(examId);
  }

  @Get('submissions/:id')
  getSubmission(@Param('id', ParseUUIDPipe) id: string) {
    return this.grading.getSubmission(id);
  }

  @Patch('submissions/:id/answers/:answerId')
  gradeAnswer(
    @Param('id', ParseUUIDPipe) submissionId: string,
    @Param('answerId', ParseUUIDPipe) answerId: string,
    @Body() dto: GradeAnswerDto,
  ) {
    return this.grading.gradeAnswer(submissionId, answerId, dto.score);
  }

  @Get('exams/:id/report')
  report(@Param('id', ParseUUIDPipe) examId: string) {
    return this.grading.report(examId);
  }
}
