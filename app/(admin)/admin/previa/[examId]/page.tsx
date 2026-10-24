import type { Metadata } from "next";
import { Suspense } from "react";
import { Notice } from "@/components/ui/Notice";
import { AdminApiError, adminFetch, requireId } from "@/lib/admin/api";
import type { TeacherExam, TeacherQuestion } from "@/lib/admin/types";
import type { StudentQuestion } from "@/lib/types";
import { ExamSkeleton } from "../../../../(aluno)/prova/[examId]/_components/ExamSkeleton";
import { PreviewClient } from "./PreviewClient";

export const metadata: Metadata = { title: "Visualizar como aluno · Painel do professor" };

export default function PreviaPage({ params }: { params: Promise<{ examId: string }> }) {
  return (
    <Suspense fallback={<ExamSkeleton />}>
      <Preview params={params} />
    </Suspense>
  );
}

/**
 * Só os campos que a API do aluno devolve (StudentQuestionDto): o professor vê
 * exatamente o que o aluno vai ver, e o gabarito nem chega ao navegador aqui.
 */
function toStudentQuestion(q: TeacherQuestion): StudentQuestion {
  return {
    id: q.id,
    order: q.order,
    type: q.type,
    statement: q.statement,
    codeSnippet: q.codeSnippet,
    codeLanguage: q.codeLanguage,
    points: q.points,
    options: q.options.map((o) => ({ id: o.id, label: o.label, text: o.text })),
  };
}

async function Preview({ params }: { params: Promise<{ examId: string }> }) {
  const examId = requireId((await params).examId);

  let exam: TeacherExam;
  let questions: TeacherQuestion[];
  try {
    [exam, questions] = await Promise.all([
      adminFetch<TeacherExam>(`/exams/${examId}`),
      adminFetch<TeacherQuestion[]>(`/admin/exams/${examId}/questions`),
    ]);
  } catch (err) {
    // redirect() (sessão vencida) e notFound() precisam subir.
    if (!(err instanceof AdminApiError)) throw err;
    return (
      <div className="mx-auto max-w-xl p-6">
        <Notice tone="danger" title="Não foi possível carregar a prova">
          {err.message}
        </Notice>
      </div>
    );
  }

  return (
    <PreviewClient
      exam={{ id: exam.id, title: exam.title, description: exam.description, durationMinutes: exam.durationMinutes }}
      questions={questions.map(toStudentQuestion)}
    />
  );
}
