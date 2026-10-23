import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { hashToken } from '../common/utils/token';
import { SubmissionsService } from './submissions.service';

describe('SubmissionsService.resolveOwnedSubmission (OwnershipGuard)', () => {
  const tokenA = 'token-do-aluno-a';
  const submissionA = {
    id: 'sub-a',
    examId: 'exam-1',
    studentEmail: 'a@escola.com',
    accessTokenHash: hashToken(tokenA),
  };

  const findUnique = jest.fn(({ where }: { where: { accessTokenHash: string } }) =>
    Promise.resolve(where.accessTokenHash === submissionA.accessTokenHash ? submissionA : null),
  );
  const service = new SubmissionsService(
    { submission: { findUnique } } as never,
    { log: jest.fn() } as never,
    {} as never,
    {} as never,
    {} as never,
  );

  it('sem token → 401', async () => {
    await expect(service.resolveOwnedSubmission('exam-1', undefined)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('token que não existe → 403', async () => {
    await expect(service.resolveOwnedSubmission('exam-1', 'chute')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('token válido usado em outra prova → 403', async () => {
    await expect(service.resolveOwnedSubmission('exam-2', tokenA)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('busca só pelo hash do token, nunca pelo token em claro', async () => {
    await expect(service.resolveOwnedSubmission('exam-1', tokenA)).resolves.toBe(submissionA);
    expect(findUnique).toHaveBeenLastCalledWith({
      where: { accessTokenHash: hashToken(tokenA) },
    });
  });
});
