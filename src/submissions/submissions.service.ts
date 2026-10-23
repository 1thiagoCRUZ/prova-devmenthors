import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { Exam, Submission } from '../../generated/prisma/client';
import { AssignmentsService } from '../assignments/assignments.service';
import { AuditService } from '../audit/audit.service';
import { normalizeEmail } from '../common/utils/email';
import { computeExpiresAt, isExamOpen } from '../common/utils/exam-window';
import { lockSubmission } from '../common/utils/locks';
import { isUniqueViolation } from '../common/utils/prisma-errors';
import { generateAccessToken, hashToken } from '../common/utils/token';
import { GradingService } from '../grading/grading.service';
import { PrismaService } from '../prisma/prisma.service';
import { QuestionsService } from '../questions/questions.service';
import { SaveAnswerDto } from './dto/save-answer.dto';
import { StudentAnswerDto } from './dto/student-answer.dto';

export interface StartResult {
  /** Só presente quando um token novo foi emitido (vai no cookie, nunca no corpo). */
  token?: string;
  submission: Submission;
}

@Injectable()
export class SubmissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly assignments: AssignmentsService,
    private readonly questions: QuestionsService,
    private readonly grading: GradingService,
  ) {}

  /**
   * Cria a submissão do e-mail ou, se ela ainda estiver IN_PROGRESS, emite um
   * token novo para ela (o anterior deixa de valer). Submissão já enviada nunca
   * recebe token novo: quem só sabe o e-mail não consegue ler as respostas.
   */
  async start(examId: string, name: string, rawEmail: string): Promise<StartResult> {
    const email = normalizeEmail(rawEmail);
    const now = new Date();
    const exam = await this.prisma.exam.findUnique({ where: { id: examId } });
    if (!exam || !isExamOpen(exam, now)) {
      throw new ForbiddenException('Prova não disponível');
    }
    if (!(await this.assignments.isAllowed(examId, email))) {
      throw new ForbiddenException('Prova não disponível para este e-mail');
    }

    const token = generateAccessToken();
    const accessTokenHash = hashToken(token);

    try {
      const submission = await this.prisma.submission.create({
        data: {
          examId,
          studentName: name,
          studentEmail: email,
          accessTokenHash,
          startedAt: now,
          expiresAt: computeExpiresAt(exam, now),
        },
      });
      await this.audit.log(email, 'submission.started', { examId, submissionId: submission.id });
      return { token, submission };
    } catch (err) {
      // UNIQUE(examId, studentEmail): já existe (ou outro request acabou de criar).
      if (!isUniqueViolation(err)) throw err;
    }

    const outcome = await this.prisma.$transaction(async (tx) => {
      const { id } = await tx.submission.findUniqueOrThrow({
        where: { examId_studentEmail: { examId, studentEmail: email } },
        select: { id: true },
      });
      await lockSubmission(tx, id);
      const current = await tx.submission.findUniqueOrThrow({ where: { id } });

      if (current.status !== 'IN_PROGRESS') {
        return { action: 'none' as const, submission: current };
      }
      if (this.isExpired(current, exam, now)) {
        const closed = await this.grading.finalize(tx, id, now);
        return { action: 'auto_closed' as const, submission: closed };
      }
      const resumed = await tx.submission.update({ where: { id }, data: { accessTokenHash } });
      return { action: 'resumed' as const, submission: resumed };
    });

    const meta = { examId, submissionId: outcome.submission.id };
    if (outcome.action === 'resumed') {
      await this.audit.log(email, 'submission.resumed', meta);
      return { token, submission: outcome.submission };
    }
    if (outcome.action === 'auto_closed') {
      await this.audit.log(email, 'submission.auto_closed', meta);
    }
    return { submission: outcome.submission };
  }

  /** Única forma de chegar a uma submissão a partir de uma rota de aluno. */
  async resolveOwnedSubmission(examId: string, token: string | undefined): Promise<Submission> {
    if (!token) throw new UnauthorizedException('Inicie a prova antes (POST /exams/:id/start)');
    const submission = await this.prisma.submission.findUnique({
      where: { accessTokenHash: hashToken(token) },
    });
    if (!submission || submission.examId !== examId) {
      throw new ForbiddenException('Token não autoriza acesso a esta prova');
    }
    return submission;
  }

  async getQuestions(submission: Submission) {
    const exam = await this.getExam(submission.examId);
    await this.assertWithinTime(submission, exam);

    const [questions, answers] = await Promise.all([
      this.questions.findForStudent(exam.id),
      this.prisma.answer.findMany({
        where: { submissionId: submission.id },
        select: { questionId: true, selectedOptionId: true, text: true },
      }),
    ]);
    const current = await this.prisma.submission.findUniqueOrThrow({
      where: { id: submission.id },
    });

    return {
      exam: { id: exam.id, title: exam.title, description: exam.description },
      submission: {
        status: current.status,
        startedAt: current.startedAt,
        expiresAt: current.expiresAt,
        submittedAt: current.submittedAt,
        readOnly: current.status !== 'IN_PROGRESS',
      },
      questions,
      answers: plainToInstance(StudentAnswerDto, answers, { excludeExtraneousValues: true }),
    };
  }

  /** Autosave idempotente: uma linha por (submissão, questão), sobrescrita a cada envio. */
  async saveAnswer(submission: Submission, dto: SaveAnswerDto) {
    const exam = await this.getExam(submission.examId);

    const outcome = await this.prisma.$transaction(async (tx) => {
      await lockSubmission(tx, submission.id);
      const current = await tx.submission.findUniqueOrThrow({ where: { id: submission.id } });
      if (current.status !== 'IN_PROGRESS') {
        throw new ConflictException('Prova já enviada; respostas não podem mais ser alteradas');
      }
      // Fechar a tentativa exige outra transação; aqui só sinaliza.
      if (this.isExpired(current, exam, new Date())) return { expired: true as const };

      const question = await tx.question.findFirst({
        where: { id: dto.questionId, examId: exam.id },
        select: { id: true, type: true, options: { select: { id: true } } },
      });
      if (!question) throw new NotFoundException('Questão não encontrada nesta prova');

      if (question.type === 'MCQ') {
        if (dto.text != null) {
          throw new BadRequestException('Questão objetiva aceita só selectedOptionId');
        }
        if (dto.selectedOptionId && !question.options.some((o) => o.id === dto.selectedOptionId)) {
          throw new BadRequestException('Alternativa não pertence a esta questão');
        }
      } else if (dto.selectedOptionId != null) {
        throw new BadRequestException('Questão discursiva aceita só text');
      }

      const data = {
        selectedOptionId: question.type === 'MCQ' ? (dto.selectedOptionId ?? null) : null,
        text: question.type === 'DISCURSIVE' ? (dto.text ?? null) : null,
      };
      const answer = await tx.answer.upsert({
        where: { submissionId_questionId: { submissionId: current.id, questionId: question.id } },
        create: { submissionId: current.id, questionId: question.id, ...data },
        update: data,
      });
      return { expired: false as const, answer };
    });

    if (outcome.expired) {
      await this.autoClose(submission.id);
      throw new ForbiddenException('Tempo da prova esgotado');
    }
    return { questionId: outcome.answer.questionId, savedAt: outcome.answer.updatedAt };
  }

  async submit(submission: Submission) {
    const result = await this.prisma.$transaction(async (tx) => {
      await lockSubmission(tx, submission.id);
      const current = await tx.submission.findUniqueOrThrow({ where: { id: submission.id } });
      if (current.status !== 'IN_PROGRESS') {
        throw new ConflictException('Prova já enviada');
      }
      return this.grading.finalize(tx, current.id);
    });
    await this.audit.log(submission.studentEmail, 'submission.submitted', {
      examId: submission.examId,
      submissionId: submission.id,
    });
    return { status: result.status, submittedAt: result.submittedAt };
  }

  /** Fecha (e corrige) uma submissão vencida. Idempotente. */
  async autoClose(submissionId: string): Promise<boolean> {
    const closed = await this.prisma.$transaction(async (tx) => {
      await lockSubmission(tx, submissionId);
      const current = await tx.submission.findUniqueOrThrow({ where: { id: submissionId } });
      if (current.status !== 'IN_PROGRESS') return null;
      return this.grading.finalize(tx, submissionId);
    });
    if (closed) {
      await this.audit.log('system', 'submission.auto_closed', {
        examId: closed.examId,
        submissionId,
      });
    }
    return closed !== null;
  }

  /** Submissões IN_PROGRESS cujo tempo acabou ou cuja prova fechou. */
  async findExpiredInProgress(now = new Date()): Promise<string[]> {
    const rows = await this.prisma.submission.findMany({
      where: {
        status: 'IN_PROGRESS',
        OR: [
          { expiresAt: { lte: now } },
          { exam: { closesAt: { lte: now } } },
          { exam: { status: { not: 'PUBLISHED' } } },
        ],
      },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  /**
   * Fora da janela da prova ou do expiresAt da tentativa → 403
   * (fechando a tentativa, se ainda estiver aberta).
   */
  private async assertWithinTime(submission: Submission, exam: Exam) {
    if (!this.isExpired(submission, exam, new Date())) return;
    if (submission.status === 'IN_PROGRESS') await this.autoClose(submission.id);
    throw new ForbiddenException('Prova fora do horário permitido');
  }

  private isExpired(submission: Submission, exam: Exam, now: Date): boolean {
    return now >= submission.expiresAt || !isExamOpen(exam, now);
  }

  private async getExam(examId: string): Promise<Exam> {
    return this.prisma.exam.findUniqueOrThrow({ where: { id: examId } });
  }
}
