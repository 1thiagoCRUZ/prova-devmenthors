import { Body, Controller, HttpCode, Post, Req, UnauthorizedException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuditService } from '../audit/audit.service';
import type { AppRequest } from '../common/request-context';
import { AdminAuthService } from './admin-auth.service';
import { AdminLoginDto } from './dto/admin-login.dto';

@Controller('admin')
export class AdminAuthController {
  constructor(
    private readonly auth: AdminAuthService,
    private readonly audit: AuditService,
  ) {}

  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async login(@Body() dto: AdminLoginDto, @Req() req: AppRequest) {
    if (!this.auth.isValidKey(dto.key)) {
      await this.audit.log('anonymous', 'admin.login_failed', { ip: req.ip });
      throw new UnauthorizedException('Chave de administrador inválida');
    }
    await this.audit.log('admin', 'admin.login', { ip: req.ip });
    return this.auth.issueToken();
  }
}
