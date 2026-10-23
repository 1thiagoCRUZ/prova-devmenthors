import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
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
