"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { StudentQuestion } from "@/lib/types";
import { AnswerCard } from "../../../../(aluno)/prova/[examId]/_components/AnswerCard";
import { QuestionDiscursive } from "../../../../(aluno)/prova/[examId]/_components/QuestionDiscursive";
import { QuestionMCQ } from "../../../../(aluno)/prova/[examId]/_components/QuestionMCQ";

interface PreviewClientProps {
  exam: { id: string; title: string; description: string | null; durationMinutes: number };
  questions: StudentQuestion[];
}

type Answers = Record<string, string | null>;

const NO_SAVE_STATES = {};

/**
 * A prova como o aluno vê (mesmos componentes da tela de prova), para o professor
 * conferir antes de publicar. Respostas ficam só na memória da página: nada vai à
 * API, não cria tentativa e não trava a edição das questões.
 */
export function PreviewClient({ exam, questions }: PreviewClientProps) {
  const [answers, setAnswers] = useState<Answers>({});
  const desktopCardId = useId();
  const mobileCardId = useId();

  const isAnswered = (questionId: string) => {
    const value = answers[questionId];
    return typeof value === "string" && value.trim().length > 0;
  };
  const answeredCount = questions.filter((q) => isAnswered(q.id)).length;
  const setAnswer = (questionId: string, value: string | null) =>
    setAnswers((prev) => ({ ...prev, [questionId]: value }));

  return (
    <div className="flex min-h-dvh flex-col bg-paper-sunken">
      <header className="sticky top-0 z-20 bg-ink text-on-ink shadow-[0_1px_0_rgb(0_0_0/0.2)]">
        <div className="mx-auto flex h-20 max-w-[100rem] items-center justify-between gap-4 px-4 sm:px-6">
          <div className="min-w-0">
            <p className="truncate text-lg font-bold sm:text-xl">{exam.title}</p>
            <p className="text-sm font-medium text-warn-on-ink">Pré-visualização do professor · nada é salvo</p>
          </div>
          <div className="flex shrink-0 items-center gap-4">
            <span className="hidden text-sm text-on-ink-muted tabular-nums sm:block">{exam.durationMinutes} min</span>
            <Link
              href={`/admin/provas/${exam.id}`}
              className="inline-flex min-h-11 items-center rounded-control border border-white/25 px-4 text-[0.9375rem] font-medium transition-colors hover:bg-white/10"
            >
              Voltar ao painel
            </Link>
          </div>
        </div>
        <div className="mx-auto flex max-w-[100rem] items-center gap-3 px-4 pb-4 sm:px-6">
          <ProgressBar
            tone="on-ink"
            value={answeredCount}
            max={questions.length}
            label="Questões respondidas"
            className="flex-1"
          />
          <span className="shrink-0 text-sm font-medium text-on-ink-muted tabular-nums">
            {answeredCount}/{questions.length} respondidas
          </span>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-[100rem] flex-1 gap-8 px-4 pt-6 pb-16 sm:px-6 sm:pt-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <main className="flex min-w-0 flex-col gap-5">
          <Notice tone="info" title="É assim que o aluno vê a prova">
            Pode marcar e escrever à vontade para testar: as respostas ficam só nesta página e somem ao sair. O gabarito
            não aparece aqui, igual na prova de verdade. Aqui as questões estão na ordem de cadastro; cada aluno recebe
            uma ordem embaralhada (objetivas primeiro, depois discursivas), numerada de 1 a {questions.length}.
          </Notice>

          {exam.description ? (
            <p className="rounded-2xl border border-line bg-paper-raised p-5 text-[1.0625rem] leading-relaxed whitespace-pre-wrap text-ink-soft sm:px-8">
              {exam.description}
            </p>
          ) : null}

          <div className="flex flex-col gap-5">
            {questions.map((question, index) =>
              question.type === "MCQ" ? (
                <QuestionMCQ
                  key={question.id}
                  question={question}
                  number={index + 1}
                  value={answers[question.id] ?? null}
                  disabled={false}
                  onChange={(value) => setAnswer(question.id, value)}
                />
              ) : (
                <QuestionDiscursive
                  key={question.id}
                  question={question}
                  number={index + 1}
                  value={answers[question.id] ?? ""}
                  disabled={false}
                  onChange={(value) => setAnswer(question.id, value)}
                />
              ),
            )}
          </div>

          <section aria-labelledby={mobileCardId} className="rounded-2xl border border-line bg-paper-raised p-5 sm:p-8 lg:hidden">
            <AnswerCard headingId={mobileCardId} questions={questions} isAnswered={isAnswered} saveStates={NO_SAVE_STATES} />
          </section>
        </main>

        <aside className="hidden lg:block">
          <div className="sticky top-36 flex flex-col gap-5 rounded-2xl border border-line bg-paper-raised p-6">
            <AnswerCard headingId={desktopCardId} questions={questions} isAnswered={isAnswered} saveStates={NO_SAVE_STATES} />
            <Button variant="secondary" className="w-full" disabled={answeredCount === 0} onClick={() => setAnswers({})}>
              Limpar respostas
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
