import { ApiError, apiRequest, isApiError } from "./api-client";
import type {
  AvailableExam,
  ExamSession,
  SaveAnswerPayload,
  SaveAnswerResponse,
  StartExamResponse,
  SubmitResponse,
} from "./types";

const examPath = (examId: string) => `/exams/${encodeURIComponent(examId)}`;

/** Cria/retoma a submissão. O token vem só como cookie httpOnly. */
export function startExam(examId: string, body: { name: string; email: string }) {
  return apiRequest<StartExamResponse>(`${examPath(examId)}/start`, { method: "POST", json: body });
}

/** Provas publicadas, dentro do horário e liberadas para o e-mail (só metadados públicos). */
export function listAvailableExams(email: string) {
  return apiRequest<AvailableExam[]>(`/exams?email=${encodeURIComponent(email)}`);
}

export function getExamSession(examId: string) {
  return apiRequest<ExamSession>(`${examPath(examId)}/questions`);
}

export function saveAnswer(examId: string, payload: SaveAnswerPayload, opts: { keepalive?: boolean } = {}) {
  return apiRequest<SaveAnswerResponse>(`${examPath(examId)}/answers`, {
    method: "POST",
    json: payload,
    keepalive: opts.keepalive,
  });
}

export function submitExam(examId: string) {
  return apiRequest<SubmitResponse>(`${examPath(examId)}/submit`, { method: "POST" });
}

/**
 * Motivo de um erro "terminal" numa rota de aluno.
 * - 403 com token inválido: outra aba/dispositivo iniciou a prova (o token foi trocado).
 * - 403 restante: fora do horário / tempo esgotado.
 * - 409: já enviada.
 *
 * O backend não manda um código de erro, só a mensagem; por isso o 403 é
 * diferenciado pelo texto "Token não autoriza acesso…" (ver relatório).
 */
export type TerminalReason = "time-up" | "submitted" | "replaced";

export function terminalReasonOf(err: unknown): TerminalReason | null {
  if (!isApiError(err)) return null;
  if (err.kind === "conflict") return "submitted";
  if (err.kind === "forbidden") return isTokenRejection(err) ? "replaced" : "time-up";
  return null;
}

/** A submissão foi fechada pelo tempo (fechamento automático) e não pelo botão "Enviar". */
export function wasClosedByTime(s: { submittedAt: string | null; expiresAt: string }) {
  return s.submittedAt !== null && Date.parse(s.submittedAt) >= Date.parse(s.expiresAt);
}

function isTokenRejection(err: ApiError) {
  return /token/i.test(err.message);
}
