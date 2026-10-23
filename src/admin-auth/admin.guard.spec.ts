import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminGuard } from './admin.guard';

describe('AdminGuard', () => {
  const auth = {
    isValidKey: (k: string) => k === 'chave-certa',
    isValidToken: async (t: string) => t === 'jwt-valido',
  };

  function run(adminOnly: boolean, headers: Record<string, string>) {
    const reflector = { getAllAndOverride: () => adminOnly } as unknown as Reflector;
    const guard = new AdminGuard(reflector, auth as never);
    const req: Record<string, unknown> = {
      header: (name: string) => headers[name.toLowerCase()],
    };
    const ctx = {
      switchToHttp: () => ({ getRequest: () => req }),
      getHandler: () => undefined,
      getClass: () => undefined,
    };
    return { result: guard.canActivate(ctx as never), req };
  }

  it('rota de professor sem credencial → 401', async () => {
    await expect(run(true, {}).result).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('chave errada → 401 mesmo em rota pública', async () => {
    await expect(run(false, { 'x-admin-key': 'errada' }).result).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('chave certa marca o request como admin', async () => {
    const { result, req } = run(true, { 'x-admin-key': 'chave-certa' });
    await expect(result).resolves.toBe(true);
    expect(req.isAdmin).toBe(true);
  });

  it('aceita o JWT de /admin/login', async () => {
    const { result, req } = run(true, { authorization: 'Bearer jwt-valido' });
    await expect(result).resolves.toBe(true);
    expect(req.isAdmin).toBe(true);
  });

  it('rota pública sem credencial passa sem virar admin', async () => {
    const { result, req } = run(false, {});
    await expect(result).resolves.toBe(true);
    expect(req.isAdmin).toBeUndefined();
  });
});
