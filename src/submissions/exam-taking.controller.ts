import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import type { Submission } from '../../generated/prisma/client';
import { CurrentSubmission } from './current-submission.decorator';
import { SaveAnswerDto } from './dto/save-answer.dto';
import { StartExamDto } from './dto/start-exam.dto';
import { OwnershipGuard } from './ownership.guard';
import { SUBMISSION_COOKIE, submissionCookieOptions } from './submission-cookie';
import { SubmissionsService } from './submissions.service';

/** Rotas do aluno. Só leem questões via QuestionsService.findForStudent(). */
@Controller('exams/:id')
export class ExamTakingController {
  constructor(
    private readonly submissions: SubmissionsService,
    private readonly config: ConfigService,
  ) {}

  @Post('start')
  @HttpCode(200)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async start(
    @Param('id', ParseUUIDPipe) examId: string,
    @Body() dto: StartExamDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { token, submission } = await this.submissions.start(examId, dto.name, dto.email);
    if (token) {
      res.cookie(
        SUBMISSION_COOKIE,
        token,
        submissionCookieOptions(examId, submission.expiresAt, {
          secure: this.config.getOrThrow<boolean>('COOKIE_SECURE'),
          sameSite: this.config.getOrThrow('COOKIE_SAMESITE'),
        }),
      );
    }
    return {
      status: submission.status,
      startedAt: submission.startedAt,
      expiresAt: submission.expiresAt,
      submittedAt: submission.submittedAt,
    };
  }

  @Get('questions')
  @UseGuards(OwnershipGuard)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  getQuestions(@CurrentSubmission() submission: Submission) {
    return this.submissions.getQuestions(submission);
  }

  @Post('answers')
  @HttpCode(200)
  @UseGuards(OwnershipGuard)
  saveAnswer(@CurrentSubmission() submission: Submission, @Body() dto: SaveAnswerDto) {
    return this.submissions.saveAnswer(submission, dto);
  }

  @Post('submit')
  @HttpCode(200)
  @UseGuards(OwnershipGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  submit(@CurrentSubmission() submission: Submission) {
    return this.submissions.submit(submission);
  }
}
