import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ADMIN_ONLY_KEY } from '../common/decorators/admin-only.decorator';
import { AppRequest } from '../common/request-context';
import { AdminAuthService } from './admin-auth.service';

/**
 * Guard global. Aceita `x-admin-key` ou `Authorization: Bearer <jwt de /admin/login>`.
 * - Credencial presente e válida: marca `req.isAdmin`.
 * - Credencial presente e inválida: 401 em qualquer rota.
 * - Sem credencial: 401 só nas rotas `@AdminOnly()`.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AdminAuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AppRequest>();
    const adminOnly = this.reflector.getAllAndOverride<boolean>(ADMIN_ONLY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const headerKey = req.header('x-admin-key');
    const authorization = req.header('authorization');
    const bearer = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined;

    if (headerKey !== undefined || bearer !== undefined) {
      const valid =
        headerKey !== undefined
          ? this.auth.isValidKey(headerKey)
          : await this.auth.isValidToken(bearer as string);
      if (!valid) throw new UnauthorizedException('Credencial de administrador inválida');
      req.isAdmin = true;
      return true;
    }

    if (adminOnly) throw new UnauthorizedException('Rota exclusiva do professor');
    return true;
  }
}
