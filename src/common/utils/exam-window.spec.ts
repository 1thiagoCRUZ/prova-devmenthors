import { computeExpiresAt, isExamOpen } from './exam-window';

describe('exam-window', () => {
  const opensAt = new Date('2026-01-01T10:00:00Z');
  const closesAt = new Date('2026-01-01T12:00:00Z');

  it('expiresAt = startedAt + duração', () => {
    const startedAt = new Date('2026-01-01T10:30:00Z');
    expect(computeExpiresAt({ durationMinutes: 30, closesAt }, startedAt)).toEqual(
      new Date('2026-01-01T11:00:00Z'),
    );
  });

  it('expiresAt nunca passa do fechamento da prova', () => {
    const startedAt = new Date('2026-01-01T11:50:00Z');
    expect(computeExpiresAt({ durationMinutes: 60, closesAt }, startedAt)).toEqual(closesAt);
  });

  it('só está aberta se PUBLISHED e dentro da janela', () => {
    const inside = new Date('2026-01-01T11:00:00Z');
    expect(isExamOpen({ status: 'PUBLISHED', opensAt, closesAt }, inside)).toBe(true);
    expect(isExamOpen({ status: 'DRAFT', opensAt, closesAt }, inside)).toBe(false);
    expect(isExamOpen({ status: 'CLOSED', opensAt, closesAt }, inside)).toBe(false);
    expect(isExamOpen({ status: 'PUBLISHED', opensAt, closesAt }, new Date('2026-01-01T09:59:59Z'))).toBe(false);
    expect(isExamOpen({ status: 'PUBLISHED', opensAt, closesAt }, closesAt)).toBe(false);
  });
});
