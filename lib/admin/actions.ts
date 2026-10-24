"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { AdminApiError, API_ORIGIN, adminFetch, requireId } from "./api";
import { examInputSchema, emailListSchema, questionInputSchema, scoreSchema, type ExamInput, type QuestionInput } from "./schemas";
import { clearAdminToken, setAdminToken } from "./session";
import type { ActionResult, ExamStatus, TeacherExam } from "./types";

/*
 * Server Actions do painel. O Next já barra chamadas de outra origem
 * (checagem de Origin), então não há CSRF; mesmo assim cada action valida a
 * entrada com zod e os IDs como UUID antes de montar a URL da API.
 */

// ---------------------------------------------------------------- sessão

export type LoginState = { error: string | null };

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = z
    .object({ username: z.string().trim().min(1).max(100), password: z.string().min(1).max(256) })
    .safeParse({ username: formData.get("username"), password: formData.get("password") });
  if (!parsed.success) return { error: "Informe usuário e senha." };

  let res: Response;
  try {
    res = await fetch(`${API_ORIGIN}/admin/login`, {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(parsed.data),
    });
  } catch {
    return { error: "A API não respondeu. Confira se o backend está no ar." };
  }

  if (res.status === 401) return { error: "Usuário ou senha inválidos." };
  if (res.status === 429) return { error: "Muitas tentativas. Aguarde um minuto e tente de novo." };
  if (!res.ok) return { error: "O servidor não conseguiu fazer o login agora." };

  const body = (await res.json()) as { accessToken?: unknown; expiresIn?: unknown };
  if (typeof body.accessToken !== "string" || typeof body.expiresIn !== "number") {
    return { error: "Resposta inesperada da API." };
  }
  await setAdminToken(body.accessToken, body.expiresIn);
  redirect("/admin");
}

export async function logoutAction() {
  await clearAdminToken();
  redirect("/admin/login");
}

// ---------------------------------------------------------------- helpers

async function run(fn: () => Promise<unknown>, paths: string[], message?: string): Promise<ActionResult> {
  try {
    await fn();
  } catch (err) {
    // redirect()/notFound() precisam subir; só erros da API viram mensagem.
    if (err instanceof AdminApiError) return { ok: false, error: err.message };
    throw err;
  }
  for (const path of paths) revalidatePath(path);
  return { ok: true, message };
}

function invalid(error: z.ZodError): ActionResult {
  return { ok: false, error: error.issues[0]?.message ?? "Dados inválidos" };
}

const examPage = (examId: string) => `/admin/provas/${examId}`;

// ---------------------------------------------------------------- provas

export async function createExamAction(input: ExamInput): Promise<ActionResult> {
  const parsed = examInputSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { description, ...rest } = parsed.data;

  let created: TeacherExam;
  try {
    created = await adminFetch<TeacherExam>("/exams", {
      method: "POST",
      json: { ...rest, ...(description ? { description } : {}) },
    });
  } catch (err) {
    if (err instanceof AdminApiError) return { ok: false, error: err.message };
    throw err;
  }
  revalidatePath("/admin");
  redirect(examPage(created.id));
}

export async function updateExamAction(examIdRaw: string, input: ExamInput): Promise<ActionResult> {
  const examId = requireId(examIdRaw);
  const parsed = examInputSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  return run(
    () => adminFetch(`/exams/${examId}`, { method: "PATCH", json: parsed.data }),
    [examPage(examId), "/admin"],
    "Prova salva.",
  );
}

export async function setExamStatusAction(examIdRaw: string, status: ExamStatus): Promise<ActionResult> {
  const examId = requireId(examIdRaw);
  const parsed = z.enum(["DRAFT", "PUBLISHED", "CLOSED"]).safeParse(status);
  if (!parsed.success) return invalid(parsed.error);
  return run(() => adminFetch(`/exams/${examId}`, { method: "PATCH", json: { status: parsed.data } }), [
    examPage(examId),
    "/admin",
  ]);
}

// ---------------------------------------------------------------- questões

function questionPayload(q: QuestionInput, isUpdate: boolean) {
  const answerKey = {
    ...(q.type === "MCQ" && q.correctOptionLabel ? { correctOptionLabel: q.correctOptionLabel } : {}),
    ...(q.expectedPoints.trim() ? { expectedPoints: q.expectedPoints.trim() } : {}),
    ...(q.rubric.trim() ? { rubric: q.rubric.trim() } : {}),
    ...(q.explanation.trim() ? { explanation: q.explanation.trim() } : {}),
  };
  return {
    // O tipo não muda depois de criada (UpdateQuestionDto não aceita `type`).
    ...(isUpdate ? {} : { type: q.type }),
    order: q.order,
    statement: q.statement,
    ...(q.codeSnippet.trim() || isUpdate ? { codeSnippet: q.codeSnippet } : {}),
    // Na edição, null limpa a linguagem; na criação, só manda se houver código.
    ...(q.codeSnippet.trim() && q.codeLanguage
      ? { codeLanguage: q.codeLanguage }
      : isUpdate
        ? { codeLanguage: null }
        : {}),
    points: q.points,
    ...(q.type === "MCQ" ? { options: q.options } : {}),
    answerKey,
  };
}

export async function saveQuestionAction(
  examIdRaw: string,
  questionIdRaw: string | null,
  input: QuestionInput,
): Promise<ActionResult> {
  const examId = requireId(examIdRaw);
  const parsed = questionInputSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  if (questionIdRaw) {
    const questionId = requireId(questionIdRaw);
    return run(
      () => adminFetch(`/questions/${questionId}`, { method: "PATCH", json: questionPayload(parsed.data, true) }),
      [examPage(examId)],
      "Questão salva.",
    );
  }
  return run(
    () => adminFetch(`/exams/${examId}/questions`, { method: "POST", json: questionPayload(parsed.data, false) }),
    [examPage(examId), "/admin"],
    "Questão adicionada.",
  );
}

export async function deleteQuestionAction(examIdRaw: string, questionIdRaw: string): Promise<ActionResult> {
  const examId = requireId(examIdRaw);
  const questionId = requireId(questionIdRaw);
  return run(() => adminFetch(`/questions/${questionId}`, { method: "DELETE" }), [examPage(examId), "/admin"]);
}

// ---------------------------------------------------------------- atribuições

export async function addAssignmentsAction(examIdRaw: string, rawEmails: string): Promise<ActionResult> {
  const examId = requireId(examIdRaw);
  const parsed = emailListSchema.safeParse(rawEmails);
  if (!parsed.success) return invalid(parsed.error);
  let result: { created: number; skipped: number } | undefined;
  const outcome = await run(
    async () => {
      result = await adminFetch(`/exams/${examId}/assignments`, { method: "POST", json: { emails: parsed.data } });
    },
    [examPage(examId), "/admin"],
  );
  if (!outcome.ok || !result) return outcome;
  const { created, skipped } = result;
  return {
    ok: true,
    message: `${created} e-mail(s) liberado(s)${skipped ? `, ${skipped} já estava(m) na lista` : ""}.`,
  };
}

export async function removeAssignmentAction(examIdRaw: string, assignmentIdRaw: string): Promise<ActionResult> {
  const examId = requireId(examIdRaw);
  const assignmentId = requireId(assignmentIdRaw);
  return run(() => adminFetch(`/exams/${examId}/assignments/${assignmentId}`, { method: "DELETE" }), [
    examPage(examId),
    "/admin",
  ]);
}

// ---------------------------------------------------------------- correção

export async function gradeAnswerAction(
  examIdRaw: string,
  submissionIdRaw: string,
  answerIdRaw: string,
  score: number,
): Promise<ActionResult> {
  const examId = requireId(examIdRaw);
  const submissionId = requireId(submissionIdRaw);
  const answerId = requireId(answerIdRaw);
  const parsed = scoreSchema.safeParse(score);
  if (!parsed.success) return invalid(parsed.error);
  return run(
    () => adminFetch(`/submissions/${submissionId}/answers/${answerId}`, { method: "PATCH", json: { score: parsed.data } }),
    [`${examPage(examId)}/submissoes`, `${examPage(examId)}/submissoes/${submissionId}`],
    "Nota salva.",
  );
}
