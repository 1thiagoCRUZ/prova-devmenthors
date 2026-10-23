import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/** Token opaco de 256 bits; vai para o aluno uma única vez (cookie). */
export function generateAccessToken(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * O token tem 256 bits de entropia, então SHA-256 basta (não há dicionário
 * para atacar) e permite buscar a submissão pelo hash com índice único.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}
