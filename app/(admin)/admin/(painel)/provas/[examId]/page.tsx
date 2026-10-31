import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Notice } from "@/components/ui/Notice";
import { adminFetch, requireId } from "@/lib/admin/api";
import { formatDateTime } from "@/lib/admin/time";
import type { Assignment, TeacherExam, TeacherQuestion } from "@/lib/admin/types";
import { AssignmentsPanel } from "../../_components/AssignmentsPanel";
import { CopyLink } from "../../_components/CopyLink";
import { ExamForm } from "../../_components/ExamForm";
import { ExamStatusActions } from "../../_components/ExamStatusActions";
import { QuestionList } from "../../_components/QuestionList";
import { RoomCode } from "../../_components/RoomCode";
import { ApiErrorNotice, ExamStatusBadge, PageHeader, PageSkeleton, Panel } from "../../_components/ui";

export const metadata: Metadata = { title: "Prova" };

const secondaryLink =
  "inline-flex min-h-11 items-center justify-center rounded-control border border-line-strong bg-paper-raised px-4 text-[0.9375rem] font-medium text-ink transition-colors hover:border-ink";

export default function ProvaAdminPage({ params }: PageProps<"/admin/provas/[examId]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ExamEditor params={params} />
    </Suspense>
  );
}

async function ExamEditor({ params }: { params: Promise<{ examId: string }> }) {
  const examId = requireId((await params).examId);

  let exam: TeacherExam;
  let questions: TeacherQuestion[];
  let assignments: Assignment[];
  try {
    [exam, questions, assignments] = await Promise.all([
      adminFetch<TeacherExam>(`/exams/${examId}`),
      adminFetch<TeacherQuestion[]>(`/admin/exams/${examId}/questions`),
      adminFetch<Assignment[]>(`/exams/${examId}/assignments`),
    ]);
  } catch (err) {
    return (
      <>
        <PageHeader back={{ href: "/admin", label: "Provas" }} title="Prova" />
        <ApiErrorNotice error={err} />
      </>
    );
  }

  const closed = exam.status === "CLOSED";
  const hasSubmissions = exam._count.submissions > 0;
  const questionsEditable = !closed && !hasSubmissions;

  return (
    <>
      <PageHeader
        back={{ href: "/admin", label: "Provas" }}
        title={exam.title}
        meta={
          <>
            <ExamStatusBadge status={exam.status} />
            <span className="tabular-nums">
              {formatDateTime(exam.opensAt)} → {formatDateTime(exam.closesAt)} · {exam.durationMinutes} min
            </span>
          </>
        }
        actions={
          <>
            <Link href={`/admin/previa/${exam.id}`} className={secondaryLink}>
              Visualizar como aluno
            </Link>
            <Link href={`/admin/provas/${exam.id}/corrigida`} className={secondaryLink}>
              Prova corrigida
            </Link>
            <Link href={`/admin/provas/${exam.id}/submissoes`} className={secondaryLink}>
              Submissões ({exam._count.submissions})
            </Link>
            <ExamStatusActions examId={exam.id} status={exam.status} />
          </>
        }
      />

      {closed ? (
        <Notice tone="warn" title="Prova encerrada" className="mb-6">
          Nada mais pode ser alterado. As submissões continuam disponíveis para correção.
        </Notice>
      ) : hasSubmissions ? (
        <Notice tone="info" title="Questões travadas" className="mb-6">
          Alunos já começaram esta prova, então questões e gabarito não podem mais mudar.
        </Notice>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section aria-labelledby="questoes" className="flex min-w-0 flex-col gap-4">
          <h2 id="questoes" className="text-xl font-bold">
            Questões <span className="font-normal text-ink-muted tabular-nums">({questions.length})</span>
          </h2>
          <QuestionList examId={exam.id} questions={questions} editable={questionsEditable} />
        </section>

        <div className="flex flex-col gap-6">
          <Panel title="Como os alunos entram">
            <RoomCode examId={exam.id} title={exam.title} />
            <p className="mt-4 text-sm text-ink-soft">
              O aluno abre o site, digita este código, nome e e-mail. Ou mande o link direto:
            </p>
            <div className="mt-2">
              <CopyLink path={`/prova/${exam.id}`} />
            </div>
            {exam.status !== "PUBLISHED" ? (
              <p className="mt-3 text-sm font-medium text-warn">Só funciona depois de publicar, dentro do horário.</p>
            ) : null}
          </Panel>
          <Panel title="Quem pode fazer">
            <AssignmentsPanel examId={exam.id} assignments={assignments} readOnly={closed} />
          </Panel>
          <Panel title="Dados da prova">
            <ExamForm exam={exam} disabled={closed} />
          </Panel>
        </div>
      </div>
    </>
  );
}
