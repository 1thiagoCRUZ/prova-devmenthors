import { ArgumentsHost, Catch, HttpException } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { actorOf, AppRequest } from '../common/request-context';
import { AuditService } from './audit.service';

const AUDITED_STATUSES = new Set([401, 403, 409, 429]);

/** Registra no AuditLog toda negativa de acesso/conflito e delega a resposta ao filtro padrão. */
@Catch()
export class AuditExceptionFilter extends BaseExceptionFilter {
  constructor(private readonly audit: AuditService) {
    super();
  }

  catch(exception: unknown, host: ArgumentsHost) {
    if (exception instanceof HttpException && AUDITED_STATUSES.has(exception.getStatus())) {
      const req = host.switchToHttp().getRequest<AppRequest>();
      void this.audit.log(actorOf(req), 'access.denied', {
        status: exception.getStatus(),
        method: req.method,
        // Sem query string: pode conter e-mail.
        path: req.path,
        ip: req.ip,
        reason: exception.message,
      });
    }
    super.catch(exception, host);
  }
}
