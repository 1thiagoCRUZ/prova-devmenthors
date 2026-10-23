import type { Prisma } from '../../../generated/prisma/client';

/**
 * Trava a linha da submissão até o fim da transação. Submit, autosave,
 * correção e fechamento automático passam por aqui, então nunca rodam
 * em paralelo sobre a mesma submissão.
 */
export async function lockSubmission(tx: Prisma.TransactionClient, submissionId: string) {
  await tx.$queryRaw`SELECT id FROM "Submission" WHERE id = ${submissionId}::uuid FOR UPDATE`;
}
