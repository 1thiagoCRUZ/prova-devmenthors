import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { AdminOnly } from '../common/decorators/admin-only.decorator';
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentsDto } from './dto/create-assignments.dto';

@Controller('exams/:id/assignments')
@AdminOnly()
export class AssignmentsController {
  constructor(private readonly assignments: AssignmentsService) {}

  @Post()
  create(@Param('id', ParseUUIDPipe) examId: string, @Body() dto: CreateAssignmentsDto) {
    return this.assignments.create(examId, dto.emails);
  }

  @Get()
  list(@Param('id', ParseUUIDPipe) examId: string) {
    return this.assignments.list(examId);
  }

  @Delete(':assignmentId')
  @HttpCode(204)
  remove(
    @Param('id', ParseUUIDPipe) examId: string,
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
  ) {
    return this.assignments.remove(examId, assignmentId);
  }
}
