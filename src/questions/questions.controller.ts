import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { AdminOnly } from '../common/decorators/admin-only.decorator';
import { CreateQuestionDto, UpdateQuestionDto } from './dto/question-input.dto';
import { QuestionsService } from './questions.service';

/** Rotas do professor. A leitura do aluno fica no ExamTakingController (só findForStudent). */
@Controller()
@AdminOnly()
export class QuestionsController {
  constructor(private readonly questions: QuestionsService) {}

  @Post('exams/:id/questions')
  create(@Param('id', ParseUUIDPipe) examId: string, @Body() dto: CreateQuestionDto) {
    return this.questions.create(examId, dto);
  }

  @Get('admin/exams/:id/questions')
  findForTeacher(@Param('id', ParseUUIDPipe) examId: string) {
    return this.questions.findForTeacher(examId);
  }

  @Patch('questions/:id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateQuestionDto) {
    return this.questions.update(id, dto);
  }

  @Delete('questions/:id')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.questions.remove(id);
  }
}
