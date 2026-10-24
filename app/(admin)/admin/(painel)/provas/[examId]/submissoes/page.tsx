import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { adminFetch, requireId } from "@/lib/admin/api";
import { formatDateTime } from "@/lib/admin/time";
import type { ExamReport, SubmissionRow, TeacherExam } from "@/lib/admin/types";
import { ApiErrorNotice, PageHeader, PageSkeleton, Panel, SubmissionStatusBadge, formatScore } from "../../../_components/ui";

export const metadata: Metadata = { title: "Submissões" };

export default function SubmissoesPage({ params }: PageProps<"/admin/provas/[examId]/submissoes">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Submissions params={params} />
    </Suspense>
  );
}

async function Submissions({ params }: { params: Promise<{ examId: string }> }) {
  const examId = requireId((await params).examId);
  const back = { href: `/admin/provas/${examId}`, label: "Voltar à prova" };

  let exam: TeacherExam;
  let rows: SubmissionRow[];
  let report: ExamReport;
  try {
    [exam, rows, report] = await Promise.all([
      adminFetch<TeacherExam>(`/exams/${examId}`),
      adminFetch<SubmissionRow[]>(`/exams/${examId}/submissions`),
      adminFetch<ExamReport>(`/exams/${examId}/report`),
    ]);
  } catch (err) {
    return (
      <>
        <PageHeader back={back} title="Submissões" />
        <ApiErrorNotice error={err} />
      </>
    );
  }

  const { submissions, scores } = report;

  return (
    <>
      <PageHeader back={back} eyebrow="Submissões e relatório" title={exam.title} />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Fazendo agora" value={submissions.inProgress} />
        <Stat label="Aguardando correção" value={submissions.submitted} />
        <Stat label="Corrigidas" value={submissions.graded} />
        <Stat
          label={`Média (de ${formatScore(report.maxScore)})`}
          value={formatScore(scores.average)}
          detail={scores.gradedCount ? `mín. ${formatScore(scores.min)} · máx. ${formatScore(scores.max)}` : "sem notas ainda"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Panel title="Alunos" className="min-w-0">
          {rows.length === 0 ? (
            <p className="text-sm text-ink-soft">Ninguém começou esta prova ainda.</p>
          ) : (
            <div className="-mx-5 overflow-x-auto sm:-mx-6">
              <table className="w-full min-w-[40rem] text-left text-sm">
                <thead className="border-b border-line text-xs text-ink-muted uppercase">
                  <tr>
                    <th scope="col" className="px-5 py-2 font-medium sm:px-6">Aluno</th>
                    <th scope="col" className="px-3 py-2 font-medium">Status</th>
                    <th scope="col" className="px-3 py-2 font-medium">Enviada</th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">Nota</th>
                    <th scope="col" className="px-5 py-2 sm:px-6"><span className="sr-only">Ações</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((s) => (
                    <tr key={s.id} className="hover:bg-paper-sunken/60">
                      <td className="px-5 py-3 sm:px-6">
                        <p className="font-medium">{s.studentName}</p>
                        <p className="text-ink-muted">{s.studentEmail}</p>
                      </td>
                      <td className="px-3 py-3">
                        <SubmissionStatusBadge status={s.status} />
                        {s.pendingGrading ? (
                          <p className="mt-1 text-xs text-warn">{s.pendingGrading} sem nota</p>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 tabular-nums">{formatDateTime(s.submittedAt)}</td>
                      <td className="px-3 py-3 text-right font-medium tabular-nums">{formatScore(s.totalScore)}</td>
                      <td className="px-5 py-3 text-right sm:px-6">
                        {s.status === "IN_PROGRESS" ? (
                          <span className="text-ink-muted">em andamento</span>
                        ) : (
                          <Link
                            href={`/admin/provas/${examId}/submissoes/${s.id}`}
                            className="font-medium text-pen hover:underline"
                          >
                            {s.status === "GRADED" ? "Ver" : "Corrigir"}
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel title="Por questão" description="Só respostas enviadas, sem identificar alunos.">
          <ol className="flex flex-col divide-y divide-line">
            {report.questions.map((q, i) => (
              <li key={q.questionId} className="py-3 first:pt-0 last:pb-0">
                <p className="text-sm font-bold">
                  Questão {i + 1}{" "}
                  <span className="font-normal text-ink-muted">· {q.type === "MCQ" ? "objetiva" : "discursiva"}</span>
                </p>
                {q.type === "MCQ" ? (
                  <>
                    <p className="mt-1 text-sm text-ink-soft tabular-nums">
                      Acerto: {q.correctRate === null ? "—" : `${Math.round(q.correctRate * 100)}%`} · {answered(q.answeredCount)}
                    </p>
                    <Distribution items={q.optionDistribution} />
                  </>
                ) : (
                  <p className="mt-1 text-sm text-ink-soft tabular-nums">
                    Média {formatScore(q.averageScore)} de {formatScore(q.points)} · {answered(q.answeredCount)}
                    {q.pendingGrading ? ` · ${q.pendingGrading} sem nota` : ""}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </Panel>
      </div>
    </>
  );
}

function Stat({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return (
    <div className="rounded-card border border-line bg-paper-raised p-4">
      <p className="text-xs font-medium text-ink-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
      {detail ? <p className="mt-0.5 text-xs text-ink-muted tabular-nums">{detail}</p> : null}
    </div>
  );
}

/** Distribuição das alternativas: barras horizontais simples (transform, sem lib de gráfico). */
function Distribution({ items }: { items: { label: string; count: number }[] }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <ul className="mt-2 flex flex-col gap-1">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-2 text-xs">
          <span className="w-4 font-mono font-medium">{item.label}</span>
          <span className="h-2 flex-1 overflow-hidden rounded-full bg-paper-sunken">
            <span
              className="block h-full w-full origin-left rounded-full bg-pen"
              style={{ transform: `scaleX(${item.count / max})` }}
            />
          </span>
          <span className="w-6 text-right tabular-nums">{item.count}</span>
        </li>
      ))}
    </ul>
  );
}

function answered(n: number) {
  return n === 1 ? "1 respondeu" : `${n} responderam`;
}
