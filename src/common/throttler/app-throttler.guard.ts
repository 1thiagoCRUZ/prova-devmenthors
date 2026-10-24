import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { SUBMISSION_COOKIE } from '../../submissions/submission-cookie';
import { hashToken } from '../utils/token';

/**
 * Rate limit por aluno, não por IP. Os alunos chegam pelo proxy do front (todos com
 * o IP do servidor do Next) e muitas vezes da mesma rede da escola: contar por IP
 * faria a turma inteira dividir um único limite. Com o token da tentativa (cookie),
 * cada aluno tem o próprio balde; sem token (início da prova, login) cai no IP.
 */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const token: unknown = req.cookies?.[SUBMISSION_COOKIE];
    if (typeof token === 'string' && token.length > 0) {
      // Hash: o token em claro não fica nem na memória do rate limiter.
      return `submission:${hashToken(token)}`;
    }
    return `ip:${req.ip}`;
  }
}
