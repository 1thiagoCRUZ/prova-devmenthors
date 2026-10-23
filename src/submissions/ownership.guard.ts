import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AppRequest } from '../common/request-context';
import { SUBMISSION_COOKIE } from './submission-cookie';
import { SubmissionsService } from './submissions.service';

/**
 * Amarra o request à submissão dona do token (cookie httpOnly) e confere que
 * ela é da prova da URL. A checagem em si fica no service.
 */
@Injectable()
export class OwnershipGuard implements CanActivate {
  constructor(private readonly submissions: SubmissionsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AppRequest>();
    const token: string | undefined = req.cookies?.[SUBMISSION_COOKIE];
    req.submission = await this.submissions.resolveOwnedSubmission(req.params.id as string, token);
    return true;
  }
}
