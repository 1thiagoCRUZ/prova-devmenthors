import { hashPassword, verifyPassword } from './password';

describe('password (scrypt)', () => {
  it('aceita a senha certa e recusa a errada', async () => {
    const stored = await hashPassword('senha-de-teste-123');
    expect(stored).toMatch(/^scrypt\$16384\$8\$1\$/);
    expect(stored).not.toContain('senha-de-teste-123');
    await expect(verifyPassword('senha-de-teste-123', stored)).resolves.toBe(true);
    await expect(verifyPassword('senha-de-teste-124', stored)).resolves.toBe(false);
  });

  it('o mesmo texto gera hashes diferentes (salt aleatório)', async () => {
    expect(await hashPassword('x'.repeat(12))).not.toBe(await hashPassword('x'.repeat(12)));
  });

  it('hash em formato inválido nunca valida', async () => {
    await expect(verifyPassword('qualquer', 'texto-qualquer')).resolves.toBe(false);
  });
});
