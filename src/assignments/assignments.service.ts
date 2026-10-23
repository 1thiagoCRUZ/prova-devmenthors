import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { normalizeEmail } from '../common/utils/email';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AssignmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(examId: string, emails: string[]) {
    await this.assertExamExists(examId);
    const unique = [...new Set(emails.map(normalizeEmail))];
    const { count } = await this.prisma.assignment.createMany({
      data: unique.map((email) => ({ examId, email })),
      skipDuplicates: true,
    });
    await this.audit.log('admin', 'assignment.created', { examId, created: count });
    return { created: count, skipped: unique.length - count };
  }

  async list(examId: string) {
    await this.assertExamExists(examId);
    return this.prisma.assignment.findMany({ where: { examId }, orderBy: { email: 'asc' } });
  }

  async remove(examId: string, assignmentId: string) {
    const { count } = await this.prisma.assignment.deleteMany({
      where: { id: assignmentId, examId },
    });
    if (count === 0) throw new NotFoundException('Atribuição não encontrada');
    await this.audit.log('admin', 'assignment.deleted', { examId, assignmentId });
  }

  /** Prova sem nenhuma atribuição é aberta a qualquer e-mail. */
  async isAllowed(examId: string, email: string): Promise<boolean> {
    const [total, match] = await Promise.all([
      this.prisma.assignment.count({ where: { examId } }),
      this.prisma.assignment.count({ where: { examId, email: normalizeEmail(email) } }),
    ]);
    return total === 0 || match > 0;
  }

  private async assertExamExists(examId: string) {
    const exam = await this.prisma.exam.findUnique({ where: { id: examId }, select: { id: true } });
    if (!exam) throw new NotFoundException('Prova não encontrada');
  }
}
