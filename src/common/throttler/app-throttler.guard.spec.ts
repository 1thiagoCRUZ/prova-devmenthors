import { hashToken } from '../utils/token';
import { AppThrottlerGuard } from './app-throttler.guard';

describe('AppThrottlerGuard.getTracker', () => {
  const guard = Object.create(AppThrottlerGuard.prototype) as AppThrottlerGuard;
  const tracker = (req: Record<string, unknown>) =>
    (guard as unknown as { getTracker(r: Record<string, unknown>): Promise<string> }).getTracker(req);

  it('alunos atrás do mesmo IP ganham baldes separados pelo token', async () => {
    const a = await tracker({ ip: '76.76.21.21', cookies: { exam_token: 'token-a' } });
    const b = await tracker({ ip: '76.76.21.21', cookies: { exam_token: 'token-b' } });
    expect(a).not.toBe(b);
    expect(a).toBe(`submission:${hashToken('token-a')}`);
  });

  it('não guarda o token em claro', async () => {
    expect(await tracker({ ip: '1.1.1.1', cookies: { exam_token: 'segredo' } })).not.toContain('segredo');
  });

  it('sem token usa o IP', async () => {
    expect(await tracker({ ip: '1.1.1.1', cookies: {} })).toBe('ip:1.1.1.1');
    expect(await tracker({ ip: '1.1.1.1' })).toBe('ip:1.1.1.1');
  });
});
