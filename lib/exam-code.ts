/**
 * Código da sala: os 6 primeiros caracteres do ID (UUID) da prova, em maiúsculas.
 * O backend não tem código curto; o aluno digita este código e o front acha a
 * prova entre as que a API libera para o e-mail dele (GET /exams?email=).
 * Não é segredo: quem controla o acesso é o backend (horário + e-mails liberados).
 */
export const EXAM_CODE_LENGTH = 6;

export function examCode(examId: string) {
  return examId.replace(/-/g, "").slice(0, EXAM_CODE_LENGTH).toUpperCase();
}

/** Normaliza o que o aluno digitou: tira espaços/hífens, maiúsculas. */
export function normalizeExamCode(input: string) {
  return input.replace(/[\s-]/g, "").toUpperCase();
}

export function isValidExamCode(code: string) {
  return new RegExp(`^[0-9A-F]{${EXAM_CODE_LENGTH}}$`).test(code);
}
