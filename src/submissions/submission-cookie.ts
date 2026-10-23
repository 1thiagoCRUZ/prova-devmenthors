import type { CookieOptions } from 'express';

export const SUBMISSION_COOKIE = 'exam_token';

export interface SubmissionCookieConfig {
  secure: boolean;
  sameSite: 'lax' | 'strict' | 'none';
}

/** Cookie escopado à própria prova: o navegador só o envia para /exams/:id/*. */
export function submissionCookieOptions(
  examId: string,
  expiresAt: Date,
  config: SubmissionCookieConfig,
): CookieOptions {
  return {
    httpOnly: true,
    secure: config.secure,
    sameSite: config.sameSite,
    path: `/exams/${examId}`,
    expires: expiresAt,
  };
}
