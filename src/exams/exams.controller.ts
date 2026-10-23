import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { AdminOnly } from '../common/decorators/admin-only.decorator';
import type { AppRequest } from '../common/request-context';
import { CreateExamDto } from './dto/create-exam.dto';
import { StudentEmailQueryDto } from './dto/student-email-query.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { ExamsService } from './exams.service';

@Controller('exams')
export class ExamsController {
  constructor(private readonly exams: ExamsService) {}

  @Post()
  @AdminOnly()
  create(@Body() dto: CreateExamDto) {
    return this.exams.create(dto);
  }

  @Patch(':id')
  @AdminOnly()
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateExamDto) {
    return this.exams.update(id, dto);
  }

  @Get()
  list(@Req() req: AppRequest, @Query() query: StudentEmailQueryDto) {
    if (req.isAdmin) return this.exams.findAllForTeacher();
    return this.exams.listForStudent(this.requireEmail(query));
  }

  @Get(':id')
  findOne(
    @Req() req: AppRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: StudentEmailQueryDto,
  ) {
    if (req.isAdmin) return this.exams.findOneForTeacher(id);
    return this.exams.findOneForStudent(id, this.requireEmail(query));
  }

  private requireEmail(query: StudentEmailQueryDto): string {
    if (!query.email) throw new BadRequestException('Informe o e-mail do aluno (?email=)');
    return query.email;
  }
}
