import type { Metadata } from "next";
import { Suspense } from "react";
import { ExamClient } from "./_components/ExamClient";
import { ExamSkeleton } from "./_components/ExamSkeleton";

export const metadata: Metadata = { title: "Prova" };

/**
 * As questões só podem ser buscadas no browser: o cookie da submissão tem
 * path=/exams/:id e não chega a esta rota do Next. O servidor entrega só o
 * esqueleto; o ExamClient busca questões e respostas salvas.
 */
export default function ProvaPage({ params }: PageProps<"/prova/[examId]">) {
  return (
    <Suspense fallback={<ExamSkeleton />}>
      <ExamClient params={params} />
    </Suspense>
  );
}
