import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type AuditAction =
  | 'admin.login'
  | 'admin.login_failed'
  | 'exam.created'
  | 'exam.updated'
  | 'question.created'
  | 'question.updated'
  | 'question.deleted'
  | 'assignment.created'
  | 'assignment.deleted'
  | 'submission.started'
  | 'submission.resumed'
  | 'submission.submitted'
  | 'submission.auto_closed'
  | 'answer.graded'
  | 'access.denied';

/**
 * Só registra; nunca bloqueia. Quem chama não deve passar token, chave nem
 * conteúdo de resposta em `metadata`.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger('Audit');

  constructor(private readonly prisma: PrismaService) {}

  async log(actor: string, action: AuditAction, metadata: Record<string, unknown> = {}) {
    this.logger.log(JSON.stringify({ type: 'audit', actor, action, metadata }));
    try {
      await this.prisma.auditLog.create({
        data: { actor, action, metadata: metadata as Prisma.InputJsonValue },
      });
    } catch (err) {
      this.logger.error(
        JSON.stringify({ type: 'audit_write_failed', action, error: (err as Error).message }),
      );
    }
  }
}
