import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Submission } from '../../generated/prisma/client';
import { AppRequest } from '../common/request-context';

/** Submissão resolvida pelo OwnershipGuard. */
export const CurrentSubmission = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): Submission => {
    const submission = ctx.switchToHttp().getRequest<AppRequest>().submission;
    if (!submission) throw new Error('CurrentSubmission usado sem OwnershipGuard');
    return submission;
  },
);
