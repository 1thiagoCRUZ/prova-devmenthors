import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { verifyPassword } from '../common/utils/password';
import { safeEqual } from '../common/utils/token';

const ADMIN_ROLE = 'TEACHER';

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
  ) {}

  isValidKey(key: string): boolean {
    return safeEqual(key, this.config.getOrThrow<string>('ADMIN_KEY'));
  }

  /** Sempre roda as duas checagens, para o tempo de resposta não revelar se o usuário existe. */
  async isValidCredentials(username: string, password: string): Promise<boolean> {
    const userOk = safeEqual(username, this.config.getOrThrow<string>('ADMIN_USERNAME'));
    const passwordOk = await verifyPassword(password, this.config.getOrThrow<string>('ADMIN_PASSWORD_HASH'));
    return userOk && passwordOk;
  }

  async issueToken(): Promise<{ accessToken: string; expiresIn: number }> {
    const expiresIn = this.config.getOrThrow<number>('ADMIN_TOKEN_TTL_MINUTES') * 60;
    const accessToken = await this.jwt.signAsync({ sub: 'admin', role: ADMIN_ROLE }, { expiresIn });
    return { accessToken, expiresIn };
  }

  async isValidToken(token: string): Promise<boolean> {
    try {
      const payload = await this.jwt.verifyAsync<{ role?: string }>(token);
      return payload.role === ADMIN_ROLE;
    } catch {
      return false;
    }
  }
}
