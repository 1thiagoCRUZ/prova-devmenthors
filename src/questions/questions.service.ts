import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { Prisma, QuestionType } from '../../generated/prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  AnswerKeyInputDto,
  CreateQuestionDto,
  OptionInputDto,
  UpdateQuestionDto,
} from './dto/question-input.dto';
import { StudentQuestionDto } from './dto/student-question.dto';

@Injectable()
export class QuestionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Única leitura usada nas rotas de aluno. O `select` não toca em `answerKey`
   * e o resultado passa pela whitelist do StudentQuestionDto.
   */
  async findForStudent(examId: string): Promise<StudentQuestionDto[]> {
    const questions = await this.prisma.question.findMany({
      where: { examId },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        order: true,
        type: true,
        statement: true,
        codeSnippet: true,
        points: true,
        options: {
          select: { id: true, label: true, text: true },
          orderBy: { label: 'asc' },
        },
      },
    });
    return plainToInstance(StudentQuestionDto, questions, { excludeExtraneousValues: true });
  }

  /** Leitura do professor: inclui gabarito. Nunca chamar a partir de rota de aluno. */
  async findForTeacher(examId: string) {
    await this.assertExamExists(examId);
    return this.prisma.question.findMany({
      where: { examId },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      include: { options: { orderBy: { label: 'asc' } }, answerKey: true },
    });
  }

  async create(examId: string, dto: CreateQuestionDto) {
    await this.assertExamExists(examId);
    await this.assertExamEditable(examId);
    this.assertShape(dto.type, dto.options, dto.answerKey, true);

    const question = await this.prisma.$transaction(async (tx) => {
      const created = await tx.question.create({
        data: {
          examId,
          order: dto.order,
          type: dto.type,
          statement: dto.statement,
          codeSnippet: dto.codeSnippet,
          points: dto.points,
          options: dto.options ? { create: dto.options } : undefined,
        },
        include: { options: true },
      });
      await this.upsertAnswerKey(tx, created.id, created.options, dto.answerKey);
      return tx.question.findUniqueOrThrow({
        where: { id: created.id },
        include: { options: { orderBy: { label: 'asc' } }, answerKey: true },
      });
    });

    await this.audit.log('admin', 'question.created', { examId, questionId: question.id });
    return question;
  }

  async update(id: string, dto: UpdateQuestionDto) {
    const existing = await this.prisma.question.findUnique({
      where: { id },
      include: { options: true, answerKey: true },
    });
    if (!existing) throw new NotFoundException('Questão não encontrada');
    await this.assertExamEditable(existing.examId);

    if (existing.type === 'DISCURSIVE') {
      this.assertShape('DISCURSIVE', dto.options, dto.answerKey, false);
    } else if (dto.options) {
      // Alternativas novas: o gabarito precisa apontar para uma delas.
      this.assertShape('MCQ', dto.options, dto.answerKey, true);
    } else if (dto.answerKey?.correctOptionLabel) {
      this.assertShape('MCQ', existing.options, dto.answerKey, true);
    }

    const question = await this.prisma.$transaction(async (tx) => {
      let options = existing.options;
      if (dto.options) {
        await tx.option.deleteMany({ where: { questionId: id } });
        await tx.option.createMany({
          data: dto.options.map((o) => ({ ...o, questionId: id })),
        });
        options = await tx.option.findMany({ where: { questionId: id } });
      }

      await tx.question.update({
        where: { id },
        data: {
          order: dto.order,
          statement: dto.statement,
          codeSnippet: dto.codeSnippet,
          points: dto.points,
        },
      });

      if (dto.answerKey) {
        await this.upsertAnswerKey(tx, id, options, dto.answerKey);
      }

      return tx.question.findUniqueOrThrow({
        where: { id },
        include: { options: { orderBy: { label: 'asc' } }, answerKey: true },
      });
    });

    await this.audit.log('admin', 'question.updated', {
      examId: existing.examId,
      questionId: id,
      fields: Object.keys(dto),
      answerKeyChanged: Boolean(dto.answerKey || dto.options),
    });
    return question;
  }

  async remove(id: string) {
    const existing = await this.prisma.question.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Questão não encontrada');
    await this.assertExamEditable(existing.examId);
    await this.prisma.question.delete({ where: { id } });
    await this.audit.log('admin', 'question.deleted', { examId: existing.examId, questionId: id });
  }

  private async upsertAnswerKey(
    tx: Prisma.TransactionClient,
    questionId: string,
    options: { id: string; label: string }[],
    key: AnswerKeyInputDto | undefined,
  ) {
    if (!key) return;
    const correctOptionId = key.correctOptionLabel
      ? options.find((o) => o.label === key.correctOptionLabel)?.id
      : undefined;
    const data = {
      correctOptionId,
      expectedPoints: key.expectedPoints,
      rubric: key.rubric,
      explanation: key.explanation,
    };
    await tx.answerKey.upsert({
      where: { questionId },
      create: { questionId, ...data },
      update: data,
    });
  }

  private assertShape(
    type: QuestionType,
    options: Pick<OptionInputDto, 'label'>[] | undefined,
    key: AnswerKeyInputDto | undefined,
    requireCorrectOption: boolean,
  ) {
    if (type === 'DISCURSIVE') {
      if (options && options.length > 0) {
        throw new BadRequestException('Questão discursiva não tem alternativas');
      }
      if (key?.correctOptionLabel) {
        throw new BadRequestException('Questão discursiva não tem alternativa correta');
      }
      return;
    }

    if (!options || options.length < 2) {
      throw new BadRequestException('Questão objetiva precisa de ao menos 2 alternativas');
    }
    const labels = options.map((o) => o.label);
    if (new Set(labels).size !== labels.length) {
      throw new BadRequestException('Alternativas com label repetido');
    }
    if (requireCorrectOption) {
      if (!key?.correctOptionLabel) {
        throw new BadRequestException('Informe answerKey.correctOptionLabel');
      }
      if (!labels.includes(key.correctOptionLabel)) {
        throw new BadRequestException('answerKey.correctOptionLabel não corresponde a nenhuma alternativa');
      }
    }
  }

  private async assertExamExists(examId: string) {
    const exam = await this.prisma.exam.findUnique({ where: { id: examId }, select: { id: true } });
    if (!exam) throw new NotFoundException('Prova não encontrada');
  }

  /** Questões/gabarito só mudam enquanto ninguém começou a prova. */
  private async assertExamEditable(examId: string) {
    const exam = await this.prisma.exam.findUniqueOrThrow({
      where: { id: examId },
      select: { status: true, _count: { select: { submissions: true } } },
    });
    if (exam.status === 'CLOSED') {
      throw new ConflictException('Prova encerrada não pode ser editada');
    }
    if (exam._count.submissions > 0) {
      throw new ConflictException('Prova já tem submissões; questões não podem mais ser alteradas');
    }
  }
}
