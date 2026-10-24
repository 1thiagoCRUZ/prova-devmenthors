import type { Metadata } from "next";
import { Suspense } from "react";
import { Badge } from "@/components/ui/Badge";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { Notice } from "@/components/ui/Notice";
import { RichText } from "@/components/ui/RichText";
import { adminFetch, requireId } from "@/lib/admin/api";
import { formatDateTime } from "@/lib/admin/time";
import type { SubmissionDetail, TeacherQuestion } from "@/lib/admin/types";
import { cn } from "@/lib/cn";
import { GradeForm } from "../../../../_components/GradeForm";
import { SecretLabel } from "../../../../_components/SecretLabel";
import { ApiErrorNotice, PageHeader, PageSkeleton, SubmissionStatusBadge, formatScore } from "../../../../_components/ui";

export const metadata: Metadata = { title: "Correção" };

export default function CorrecaoPage({ params }: PageProps<"/admin/provas/[examId]/submissoes/[submissionId]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Grading params={params} />
    </Suspense>
  );
}

async function Grading({ params }: { params: Promise<{ examId: string; submissionId: string }> }) {
  const raw = await params;
  const examId = requireId(raw.examId);
  const submissionId = requireId(raw.submissionId);
  const back = { href: `/admin/provas/${examId}/submissoes`, label: "Submissões" };

  let submission: SubmissionDetail;
  let questions: TeacherQuestion[];
  try {
    [submission, questions] = await Promise.all([
      adminFetch<SubmissionDetail>(`/submissions/${submissionId}`),
      adminFetch<TeacherQuestion[]>(`/admin/exams/${examId}/questions`),
    ]);
  } catch (err) {
    return (
      <>
        <PageHeader back={back} title="Correção" />
        <ApiErrorNotice error={err} />
      </>
    );
  }
  if (submission.examId !== examId) {
    return (
      <>
        <PageHeader back={back} title="Correção" />
        <Notice tone="danger">Esta submissão não pertence a esta prova.</Notice>
      </>
    );
  }

  // Só existem linhas de resposta para o que o aluno chegou a salvar: junta com todas as questões.
  const answerByQuestion = new Map(submission.answers.map((a) => [a.questionId, a]));
  const maxScore = questions.reduce((sum, q) => sum + q.points, 0);
  const inProgress = submission.status === "IN_PROGRESS";

  return (
    <>
      <PageHeader
        back={back}
        eyebrow="Correção"
        title={submission.studentName}
        meta={
          <>
            <SubmissionStatusBadge status={submission.status} />
            <span>{submission.studentEmail}</span>
            <span className="tabular-nums">· enviada {formatDateTime(submission.submittedAt)}</span>
          </>
        }
        actions={
          <div className="rounded-card border border-line bg-paper-raised px-4 py-2 text-right">
            <p className="text-xs text-ink-muted">Nota final</p>
            <p className="text-2xl font-bold tabular-nums">
              {formatScore(submission.totalScore)} <span className="text-base font-normal text-ink-muted">/ {formatScore(maxScore)}</span>
            </p>
          </div>
        }
      />

      {inProgress ? (
        <Notice tone="info" className="mb-6" title="Prova em andamento">
          A correção fica disponível depois que o aluno enviar (ou o tempo acabar).
        </Notice>
      ) : null}

      <ol className="flex flex-col gap-4">
        {questions.map((q, index) => {
          const answer = answerByQuestion.get(q.id);
          const correctOption = q.options.find((o) => o.id === q.answerKey?.correctOptionId);
          const blank = q.type === "MCQ" ? !answer?.selectedOptionId : !answer?.text?.trim();
          const right = q.type === "MCQ" && !!answer?.selectedOptionId && answer.selectedOptionId === correctOption?.id;

          return (
            <li key={q.id} className="rounded-card border border-line bg-paper-raised p-5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-2xl font-bold tabular-nums">{String(index + 1).padStart(2, "0")}</span>
                <Badge>{q.type === "MCQ" ? "Múltipla escolha" : "Discursiva"}</Badge>
                <span className="ml-auto text-sm font-medium tabular-nums">
                  {formatScore(answer?.score ?? (blank && !inProgress ? 0 : null))} / {formatScore(q.points)}
                </span>
              </div>
              <p className="mt-3 leading-relaxed">
                <RichText text={q.statement} codeSize="sm" />
              </p>
              {q.codeSnippet ? (
                <CodeBlock code={q.codeSnippet} language={q.codeLanguage} size="sm" className="mt-3" />
              ) : null}

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-control border border-line p-3">
                  <p className="text-xs font-medium tracking-wide text-ink-muted uppercase">Resposta do aluno</p>
                  {blank ? (
                    <p className="mt-1 text-sm text-ink-muted italic">Em branco</p>
                  ) : q.type === "MCQ" ? (
                    <div className={cn("mt-1 flex flex-col gap-1.5 text-sm", right ? "text-ok" : "text-danger")}>
                      <p>
                        <span className="font-mono font-medium">{answer?.selectedOption?.label}</span> ·{" "}
                        <strong>{right ? "certa" : "errada"}</strong>
                      </p>
                      <RichText text={answer?.selectedOption?.text ?? ""} codeSize="sm" className="text-ink" />
                    </div>
                  ) : (
                    <p className="mt-1 text-sm leading-relaxed break-words whitespace-pre-wrap">{answer?.text}</p>
                  )}
                </div>

                <div className="rounded-control border border-dashed border-line-strong bg-paper-sunken/60 p-3 text-sm">
                  <SecretLabel />
                  {q.type === "MCQ" ? (
                    <div className="mt-2 flex flex-col gap-1.5">
                      <p>
                        Correta: <span className="font-mono font-medium">{correctOption?.label ?? "—"}</span>
                      </p>
                      {correctOption ? <RichText text={correctOption.text} codeSize="sm" /> : null}
                    </div>
                  ) : (
                    <div className="mt-2 flex flex-col gap-1.5 whitespace-pre-wrap">
                      {q.answerKey?.expectedPoints ? (
                        <p><span className="font-medium">Pontos esperados: </span>{q.answerKey.expectedPoints}</p>
                      ) : null}
                      {q.answerKey?.rubric ? (
                        <p><span className="font-medium">Rubrica: </span>{q.answerKey.rubric}</p>
                      ) : null}
                      {!q.answerKey?.expectedPoints && !q.answerKey?.rubric ? (
                        <p className="text-ink-muted">Sem rubrica cadastrada.</p>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>

              {q.type === "DISCURSIVE" && answer && !blank && !inProgress ? (
                <div className="mt-4">
                  <GradeForm
                    examId={examId}
                    submissionId={submission.id}
                    answerId={answer.id}
                    maxPoints={q.points}
                    current={answer.score}
                  />
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </>
  );
}
