import type { Request } from 'express';
import type { Submission } from '../../generated/prisma/client';

export interface AppRequest extends Request {
  isAdmin?: boolean;
  /** Preenchido pelo OwnershipGuard: a submissão dona do token recebido. */
  submission?: Submission;
}

export function actorOf(req: AppRequest): string {
  if (req.isAdmin) return 'admin';
  if (req.submission) return req.submission.studentEmail;
  return 'anonymous';
}
