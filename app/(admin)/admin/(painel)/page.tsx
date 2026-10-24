import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { adminFetch } from "@/lib/admin/api";
import { formatDateTime } from "@/lib/admin/time";
import { examCode } from "@/lib/exam-code";
import type { TeacherExam } from "@/lib/admin/types";
import { ApiErrorNotice, ExamStatusBadge, PageHeader, PageSkeleton } from "./_components/ui";

export const metadata: Metadata = { title: "Provas" };

const primaryLink =
  "inline-flex min-h-11 items-center justify-center rounded-control bg-pen px-4 text-[0.9375rem] font-medium text-white transition-colors hover:bg-pen-hover";

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Provas"
        actions={
          <Link href="/admin/provas/nova" className={primaryLink}>
            Nova prova
          </Link>
        }
      />
      <Suspense fallback={<PageSkeleton />}>
        <ExamList />
      </Suspense>
    </>
  );
}

async function ExamList() {
  let exams: TeacherExam[];
  try {
    exams = await adminFetch<TeacherExam[]>("/exams");
  } catch (err) {
    return <ApiErrorNotice error={err} />;
  }

  if (exams.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-line-strong bg-paper-raised px-6 py-12 text-center">
        <p className="text-lg font-bold">Nenhuma prova ainda</p>
        <p className="mt-1 text-sm text-ink-soft">Crie a primeira prova, adicione as questões e publique.</p>
        <Link href="/admin/provas/nova" className={`${primaryLink} mt-5`}>
          Criar prova
        </Link>
      </div>
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {exams.map((exam) => (
        <li key={exam.id}>
          <Link
            href={`/admin/provas/${exam.id}`}
            className="group flex h-full flex-col rounded-card border border-line bg-paper-raised p-5 transition-[border-color,box-shadow] hover:border-pen hover:shadow-sheet"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-bold leading-snug break-words group-hover:text-pen">{exam.title}</h2>
              <ExamStatusBadge status={exam.status} />
            </div>
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
              <dt className="text-ink-muted">Abre</dt>
              <dd className="tabular-nums">{formatDateTime(exam.opensAt)}</dd>
              <dt className="text-ink-muted">Fecha</dt>
              <dd className="tabular-nums">{formatDateTime(exam.closesAt)}</dd>
              <dt className="text-ink-muted">Duração</dt>
              <dd>{exam.durationMinutes} min</dd>
              <dt className="text-ink-muted">Código</dt>
              <dd className="font-mono font-medium tracking-widest">{examCode(exam.id)}</dd>
            </dl>
            <p className="mt-auto pt-4 text-sm text-ink-soft tabular-nums">
              {exam._count.questions} questões · {exam._count.submissions} submissões ·{" "}
              {exam._count.assignments === 0 ? "aberta a qualquer e-mail" : `${exam._count.assignments} e-mails`}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
