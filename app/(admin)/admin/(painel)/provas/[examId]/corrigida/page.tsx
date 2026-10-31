import type { Metadata } from "next";
import { Suspense } from "react";
import { Badge } from "@/components/ui/Badge";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { RichText } from "@/components/ui/RichText";
import { adminFetch, requireId } from "@/lib/admin/api";
import type { TeacherExam, TeacherQuestion } from "@/lib/admin/types";
import { cn } from "@/lib/cn";
import { ApiErrorNotice, PageHeader, PageSkeleton } from "../../../_components/ui";
import { SecretLabel } from "../../../_components/SecretLabel";

export const metadata: Metadata = { title: "Prova corrigida" };

export default function CorrigidaPage({ params }: PageProps<"/admin/provas/[examId]/corrigida">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Corrigida params={params} />
    </Suspense>
  );
}

async function Corrigida({ params }: { params: Promise<{ examId: string }> }) {
  const examId = requireId((await params).examId);
  const back = { href: `/admin/provas/${examId}`, label: "Voltar à prova" };

  let exam: TeacherExam;
  let questions: TeacherQuestion[];
  try {
    [exam, questions] = await Promise.all([
      adminFetch<TeacherExam>(`/exams/${examId}`),
      adminFetch<TeacherQuestion[]>(`/admin/exams/${examId}/questions`),
    ]);
  } catch (err) {
    return (
      <>
        <PageHeader back={back} title="Prova corrigida" />
        <ApiErrorNotice error={err} />
      </>
    );
  }

  const objective = questions.filter((q) => q.type === "MCQ");
  const discursive = questions.filter((q) => q.type !== "MCQ");
  const letterOf = (q: TeacherQuestion) => q.options.find((o) => o.id === q.answerKey?.correctOptionId)?.label ?? "?";

  return (
    <>
      <PageHeader
        back={back}
        eyebrow="Prova corrigida"
        title={exam.title}
        meta={
          <>
            <SecretLabel />
            <span>Numeração pela ordem de cadastro. Os alunos viram as questões embaralhadas.</span>
          </>
        }
      />

      <div className="flex flex-col gap-8">
        {objective.length > 0 ? (
          <section aria-labelledby="gabarito" className="rounded-2xl border border-line bg-paper-raised p-5 sm:p-7">
            <h2 id="gabarito" className="text-xl font-bold">
              Gabarito das objetivas
            </h2>
            <ul className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(4.5rem,1fr))] gap-2">
              {objective.map((q) => (
                <li key={q.id}>
                  <a
                    href={`#q${q.order}`}
                    className="flex items-baseline justify-between gap-2 rounded-control border border-line bg-paper-sunken px-3 py-1.5 hover:border-pen"
                  >
                    <span className="font-mono text-sm text-ink-muted">{q.order}</span>
                    <b className="text-lg text-pen">{letterOf(q)}</b>
                  </a>
                </li>
              ))}
            </ul>
            {discursive.length > 0 ? (
              <p className="mt-4 text-sm">
                <a href={`#q${discursive[0].order}`} className="font-medium text-pen hover:underline">
                  Ir para as discursivas ({discursive[0].order} a {discursive[discursive.length - 1].order})
                </a>
              </p>
            ) : null}
          </section>
        ) : null}

        <QuestionSection title="Objetivas" questions={objective} />
        <QuestionSection title="Discursivas" questions={discursive} />
      </div>
    </>
  );
}

function QuestionSection({ title, questions }: { title: string; questions: TeacherQuestion[] }) {
  if (questions.length === 0) return null;
  return (
    <section aria-label={title} className="flex flex-col gap-4">
      <h2 className="text-2xl font-bold">{title}</h2>
      <ol className="flex flex-col gap-4">
        {questions.map((q) => (
          <li key={q.id} id={`q${q.order}`} className="scroll-mt-4 rounded-card border border-line bg-paper-raised p-5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-2xl font-bold tabular-nums">{String(q.order).padStart(2, "0")}</span>
              <Badge>{q.type === "MCQ" ? "Múltipla escolha" : "Discursiva"}</Badge>
              <span className="text-sm text-ink-muted">
                {q.points.toLocaleString("pt-BR")} {q.points === 1 ? "ponto" : "pontos"}
              </span>
            </div>

            <p className="mt-3 leading-relaxed">
              <RichText text={q.statement} codeSize="sm" />
            </p>
            {q.codeSnippet ? <CodeBlock code={q.codeSnippet} language={q.codeLanguage} size="sm" className="mt-3" /> : null}

            {q.type === "MCQ" ? <Answer question={q} /> : <DiscursiveAnswer question={q} />}
          </li>
        ))}
      </ol>
    </section>
  );
}

function Answer({ question: q }: { question: TeacherQuestion }) {
  return (
    <>
      <ul className="mt-3 flex flex-col gap-1.5">
        {q.options.map((o) => {
          const correct = o.id === q.answerKey?.correctOptionId;
          return (
            <li
              key={o.id}
              className={cn(
                "flex items-start gap-2.5 rounded-control border px-3 py-2 text-sm",
                correct ? "border-pen bg-pen-soft" : "border-line",
              )}
            >
              <span className="font-mono font-medium">{o.label}</span>
              <RichText text={o.text} codeSize="sm" className="flex-1" />
              {correct ? <Badge tone="pen">Resposta certa</Badge> : null}
            </li>
          );
        })}
      </ul>
      {q.answerKey?.explanation ? (
        <p className="mt-3 text-sm">
          <span className="font-bold text-pen">Por quê: </span>
          <RichText text={q.answerKey.explanation} codeSize="sm" className="mt-1" />
        </p>
      ) : null}
    </>
  );
}

function DiscursiveAnswer({ question: q }: { question: TeacherQuestion }) {
  const key = q.answerKey;
  if (!key || (!key.explanation && !key.expectedPoints)) {
    return <p className="mt-3 text-sm text-ink-muted">Esta questão não tem resposta esperada cadastrada.</p>;
  }
  return (
    <div className="mt-4 flex flex-col gap-3">
      {key.explanation ? (
        <div className="rounded-control border-l-4 border-ok bg-ok-soft p-4 text-sm">
          <p className="mb-2 text-xs font-medium tracking-wide text-ok uppercase">Resposta em palavras simples</p>
          <RichText text={key.explanation} codeSize="sm" />
        </div>
      ) : null}
      {key.expectedPoints ? (
        <div className="rounded-control border-l-4 border-line-strong bg-paper-sunken p-4 text-sm">
          <p className="mb-2 text-xs font-medium tracking-wide text-ink-muted uppercase">Resposta esperada, versão completa</p>
          <RichText text={key.expectedPoints} codeSize="sm" />
        </div>
      ) : null}
    </div>
  );
}
