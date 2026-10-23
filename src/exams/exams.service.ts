import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { Exam, ExamStatus } from '../../generated/prisma/client';
import { AuditService } from '../audit/audit.service';
import { normalizeEmail } from '../common/utils/email';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { StudentExamDto } from './dto/student-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';

const ALLOWED_TRANSITIONS: Record<ExamStatus, ExamStatus[]> = {
  DRAFT: ['PUBLISHED'],
  PUBLISHED: ['DRAFT', 'CLOSED'],
  CLOSED: [],
};

@Injectable()
export class ExamsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateExamDto) {
    this.assertWindow(dto.opensAt, dto.closesAt);
    const exam = await this.prisma.exam.create({ data: { ...dto, status: 'DRAFT' } });
    await this.audit.log('admin', 'exam.created', { examId: exam.id });
    return exam;
  }

  async update(id: string, dto: UpdateExamDto) {
    const exam = await this.getOrThrow(id);
    if (exam.status === 'CLOSED') {
      throw new ConflictException('Prova encerrada não pode ser editada');
    }

    this.assertWindow(dto.opensAt ?? exam.opensAt, dto.closesAt ?? exam.closesAt);

    if (dto.status && dto.status !== exam.status) {
      await this.assertTransition(exam, dto.status);
    }

    const updated = await this.prisma.exam.update({ where: { id }, data: dto });
    await this.audit.log('admin', 'exam.updated', {
      examId: id,
      fields: Object.keys(dto),
      ...(dto.status ? { from: exam.status, to: dto.status } : {}),
    });
    return updated;
  }

  findAllForTeacher() {
    return this.prisma.exam.findMany({
      orderBy: { opensAt: 'desc' },
      include: { _count: { select: { questions: true, submissions: true, assignments: true } } },
    });
  }

  async findOneForTeacher(id: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id },
      include: { _count: { select: { questions: true, submissions: true, assignments: true } } },
    });
    if (!exam) throw new NotFoundException('Prova não encontrada');
    return exam;
  }

  /** Provas publicadas, dentro da janela, liberadas para o e-mail (ou sem Assignment = abertas). */
  async listForStudent(email: string): Promise<StudentExamDto[]> {
    const now = new Date();
    const exams = await this.prisma.exam.findMany({
      where: { ...this.studentVisibleWhere(normalizeEmail(email), now) },
      orderBy: { closesAt: 'asc' },
    });
    return exams.map((e) => this.toStudentDto(e));
  }

  async findOneForStudent(id: string, email: string): Promise<StudentExamDto> {
    const exam = await this.prisma.exam.findFirst({
      where: { id, ...this.studentVisibleWhere(normalizeEmail(email), new Date()) },
    });
    // 404 (e não 403) para não confirmar a existência da prova.
    if (!exam) throw new NotFoundException('Prova não encontrada');
    return this.toStudentDto(exam);
  }

  async getOrThrow(id: string): Promise<Exam> {
    const exam = await this.prisma.exam.findUnique({ where: { id } });
    if (!exam) throw new NotFoundException('Prova não encontrada');
    return exam;
  }

  private studentVisibleWhere(email: string, now: Date) {
    return {
      status: 'PUBLISHED' as const,
      opensAt: { lte: now },
      closesAt: { gt: now },
      OR: [{ assignments: { none: {} } }, { assignments: { some: { email } } }],
    };
  }

  private toStudentDto(exam: Exam): StudentExamDto {
    return plainToInstance(StudentExamDto, exam, { excludeExtraneousValues: true });
  }

  private assertWindow(opensAt: Date, closesAt: Date) {
    if (opensAt >= closesAt) {
      throw new BadRequestException('opensAt precisa ser anterior a closesAt');
    }
  }

  private async assertTransition(exam: Exam, to: ExamStatus) {
    if (!ALLOWED_TRANSITIONS[exam.status].includes(to)) {
      throw new ConflictException(`Transição inválida: ${exam.status} → ${to}`);
    }

    if (to === 'DRAFT') {
      const submissions = await this.prisma.submission.count({ where: { examId: exam.id } });
      if (submissions > 0) {
        throw new ConflictException('Prova com submissões não pode voltar para rascunho');
      }
    }

    if (to === 'PUBLISHED') {
      const questions = await this.prisma.question.findMany({
        where: { examId: exam.id },
        include: { options: true, answerKey: true },
      });
      if (questions.length === 0) {
        throw new BadRequestException('Prova precisa de ao menos uma questão para ser publicada');
      }
      const invalid = questions.filter(
        (q) =>
          q.type === 'MCQ' &&
          (q.options.length < 2 ||
            !q.answerKey?.correctOptionId ||
            !q.options.some((o) => o.id === q.answerKey?.correctOptionId)),
      );
      if (invalid.length > 0) {
        throw new BadRequestException({
          message: 'Questões objetivas sem alternativas ou sem gabarito',
          questionIds: invalid.map((q) => q.id),
        });
      }
    }
  }
}
