import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { AuditService } from '../audit/audit.service';
import { lockSubmission } from '../common/utils/locks';
import { PrismaService } from '../prisma/prisma.service';
import { computeAutoScores } from './auto-score';

@Injectable()
export class GradingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Fecha a submissão e corrige as objetivas comparando com o AnswerKey do banco.
   * Precisa rodar dentro de uma transação que já travou a linha (lockSubmission)
   * e conferiu que o status é IN_PROGRESS.
   */
  async finalize(tx: Prisma.TransactionClient, submissionId: string, now = new Date()) {
    const submission = await tx.submission.findUniqueOrThrow({
      where: { id: submissionId },
      include: { answers: true },
    });
    const questions = await tx.question.findMany({
      where: { examId: submission.examId },
      select: { id: true, type: true, points: true, answerKey: { select: { correctOptionId: true } } },
    });

    const scores = computeAutoScores(questions, submission.answers);
    for (const [questionId, score] of scores) {
      await tx.answer.upsert({
        where: { submissionId_questionId: { submissionId, questionId } },
        create: { submissionId, questionId, score },
        update: { score },
      });
    }

    const values = [...scores.values()];
    const pending = values.some((s) => s === null);
    return tx.submission.update({
      where: { id: submissionId },
      data: {
        status: pending ? 'SUBMITTED' : 'GRADED',
        submittedAt: now,
        totalScore: pending ? null : values.reduce<number>((sum, s) => sum + (s ?? 0), 0),
      },
    });
  }

  async listSubmissions(examId: string) {
    await this.assertExamExists(examId);
    const submissions = await this.prisma.submission.findMany({
      where: { examId },
      orderBy: { startedAt: 'asc' },
      select: {
        id: true,
        studentName: true,
        studentEmail: true,
        status: true,
        startedAt: true,
        expiresAt: true,
        submittedAt: true,
        totalScore: true,
        _count: { select: { answers: { where: { score: null } } } },
      },
    });
    return submissions.map(({ _count, ...s }) => ({
      ...s,
      pendingGrading: s.status === 'IN_PROGRESS' ? null : _count.answers,
    }));
  }

  async getSubmission(id: string) {
    const submission = await this.prisma.submission.findUnique({
      where: { id },
      select: {
        id: true,
        examId: true,
        studentName: true,
        studentEmail: true,
        status: true,
        startedAt: true,
        expiresAt: true,
        submittedAt: true,
        totalScore: true,
        answers: {
          orderBy: { question: { order: 'asc' } },
          select: {
            id: true,
            questionId: true,
            selectedOptionId: true,
            text: true,
            score: true,
            updatedAt: true,
            selectedOption: { select: { label: true, text: true } },
            question: {
              select: {
                order: true,
                type: true,
                statement: true,
                points: true,
                answerKey: true,
              },
            },
          },
        },
      },
    });
    if (!submission) throw new NotFoundException('Submissão não encontrada');
    return submission;
  }

  /** Professor atribui nota a uma discursiva. Nunca altera o conteúdo da resposta. */
  async gradeAnswer(submissionId: string, answerId: string, score: number) {
    const result = await this.prisma.$transaction(async (tx) => {
      await lockSubmission(tx, submissionId);
      const submission = await tx.submission.findUnique({ where: { id: submissionId } });
      if (!submission) throw new NotFoundException('Submissão não encontrada');
      if (submission.status === 'IN_PROGRESS') {
        throw new ConflictException('Submissão ainda em andamento');
      }

      const answer = await tx.answer.findFirst({
        where: { id: answerId, submissionId },
        include: { question: { select: { type: true, points: true } } },
      });
      if (!answer) throw new NotFoundException('Resposta não encontrada nesta submissão');
      if (answer.question.type !== 'DISCURSIVE') {
        throw new BadRequestException('Questões objetivas são corrigidas automaticamente');
      }
      if (score > answer.question.points) {
        throw new BadRequestException(`Nota máxima desta questão é ${answer.question.points}`);
      }

      await tx.answer.update({ where: { id: answerId }, data: { score } });

      const answers = await tx.answer.findMany({ where: { submissionId }, select: { score: true } });
      const pending = answers.some((a) => a.score === null);
      return tx.submission.update({
        where: { id: submissionId },
        data: {
          status: pending ? 'SUBMITTED' : 'GRADED',
          totalScore: pending ? null : answers.reduce((sum, a) => sum + (a.score ?? 0), 0),
        },
        select: { id: true, status: true, totalScore: true },
      });
    });

    await this.audit.log('admin', 'answer.graded', { submissionId, answerId, score });
    return result;
  }

  /** Visão agregada da prova: sem identificar aluno nenhum. */
  async report(examId: string) {
    await this.assertExamExists(examId);

    const [questions, byStatus, graded, answers, discursiveAnswered] = await Promise.all([
      this.prisma.question.findMany({
        where: { examId },
        orderBy: { order: 'asc' },
        select: {
          id: true,
          order: true,
          type: true,
          points: true,
          options: { select: { id: true, label: true }, orderBy: { label: 'asc' } },
          answerKey: { select: { correctOptionId: true } },
        },
      }),
      this.prisma.submission.groupBy({ by: ['status'], where: { examId }, _count: true }),
      this.prisma.submission.aggregate({
        where: { examId, status: 'GRADED' },
        _avg: { totalScore: true },
        _min: { totalScore: true },
        _max: { totalScore: true },
        _count: true,
      }),
      this.prisma.answer.findMany({
        where: { submission: { examId, status: { not: 'IN_PROGRESS' } } },
        select: { questionId: true, selectedOptionId: true, score: true },
      }),
      this.prisma.answer.groupBy({
        by: ['questionId'],
        where: {
          submission: { examId, status: { not: 'IN_PROGRESS' } },
          question: { type: 'DISCURSIVE' },
          AND: [{ text: { not: null } }, { text: { not: '' } }],
        },
        _count: true,
      }),
    ]);

    const statusCount = Object.fromEntries(byStatus.map((s) => [s.status, s._count]));
    const discursiveCount = new Map(discursiveAnswered.map((d) => [d.questionId, d._count]));

    const perQuestion = questions.map((q) => {
      const qa = answers.filter((a) => a.questionId === q.id);
      const scored = qa.filter((a) => a.score !== null);
      const averageScore = scored.length
        ? scored.reduce((sum, a) => sum + (a.score ?? 0), 0) / scored.length
        : null;

      if (q.type === 'MCQ') {
        return {
          questionId: q.id,
          order: q.order,
          type: q.type,
          points: q.points,
          answeredCount: qa.filter((a) => a.selectedOptionId).length,
          averageScore,
          correctRate: qa.length
            ? qa.filter((a) => a.selectedOptionId === q.answerKey?.correctOptionId).length / qa.length
            : null,
          optionDistribution: q.options.map((o) => ({
            label: o.label,
            count: qa.filter((a) => a.selectedOptionId === o.id).length,
          })),
        };
      }
      return {
        questionId: q.id,
        order: q.order,
        type: q.type,
        points: q.points,
        answeredCount: discursiveCount.get(q.id) ?? 0,
        averageScore,
        pendingGrading: qa.length - scored.length,
      };
    });

    return {
      examId,
      maxScore: questions.reduce((sum, q) => sum + q.points, 0),
      submissions: {
        inProgress: statusCount.IN_PROGRESS ?? 0,
        submitted: statusCount.SUBMITTED ?? 0,
        graded: statusCount.GRADED ?? 0,
      },
      scores: {
        gradedCount: graded._count,
        average: graded._avg.totalScore,
        min: graded._min.totalScore,
        max: graded._max.totalScore,
      },
      questions: perQuestion,
    };
  }

  private async assertExamExists(examId: string) {
    const exam = await this.prisma.exam.findUnique({ where: { id: examId }, select: { id: true } });
    if (!exam) throw new NotFoundException('Prova não encontrada');
  }
}
