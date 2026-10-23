import type { Exam } from '../../../generated/prisma/client';

type ExamWindow = Pick<Exam, 'status' | 'opensAt' | 'closesAt'>;

/** A prova está aceitando alunos agora? (PUBLISHED e dentro de opensAt–closesAt) */
export function isExamOpen(exam: ExamWindow, now = new Date()): boolean {
  return exam.status === 'PUBLISHED' && exam.opensAt <= now && now < exam.closesAt;
}

/** expiresAt da tentativa: calculado só no servidor, nunca vem do front. */
export function computeExpiresAt(
  exam: Pick<Exam, 'durationMinutes' | 'closesAt'>,
  startedAt: Date,
): Date {
  const byDuration = new Date(startedAt.getTime() + exam.durationMinutes * 60_000);
  return byDuration < exam.closesAt ? byDuration : exam.closesAt;
}
