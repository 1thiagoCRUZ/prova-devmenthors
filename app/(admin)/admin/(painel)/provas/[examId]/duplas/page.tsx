import type { Metadata } from "next";
import { Suspense } from "react";
import { adminFetch, requireId } from "@/lib/admin/api";
import type { SubmissionRow, TeacherExam } from "@/lib/admin/types";
import type { Person } from "@/lib/pairs";
import { ApiErrorNotice, PageHeader, PageSkeleton } from "../../../_components/ui";
import { PairPicker } from "./PairPicker";

export const metadata: Metadata = { title: "Sortear duplas" };

export default function DuplasPage({ params }: PageProps<"/admin/provas/[examId]/duplas">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Duplas params={params} />
    </Suspense>
  );
}

async function Duplas({ params }: { params: Promise<{ examId: string }> }) {
  const examId = requireId((await params).examId);
  const back = { href: `/admin/provas/${examId}/submissoes`, label: "Voltar às submissões" };

  let exam: TeacherExam;
  let rows: SubmissionRow[];
  try {
    [exam, rows] = await Promise.all([
      adminFetch<TeacherExam>(`/exams/${examId}`),
      adminFetch<SubmissionRow[]>(`/exams/${examId}/submissions`),
    ]);
  } catch (err) {
    return (
      <>
        <PageHeader back={back} title="Sortear duplas" />
        <ApiErrorNotice error={err} />
      </>
    );
  }

  // Só nome e nota: o e-mail não precisa chegar a essa tela (ela pode estar no projetor).
  const people: Person[] = rows.map((s) => ({ id: s.id, name: s.studentName, score: s.totalScore }));

  return (
    <>
      <PageHeader back={back} eyebrow="Sorteio de duplas" title={exam.title} />
      <PairPicker people={people} />
    </>
  );
}
