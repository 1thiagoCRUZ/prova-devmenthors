"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { Modal } from "@/components/ui/Modal";
import { Notice } from "@/components/ui/Notice";
import { RichText } from "@/components/ui/RichText";
import { deleteQuestionAction } from "@/lib/admin/actions";
import type { TeacherQuestion } from "@/lib/admin/types";
import { cn } from "@/lib/cn";
import { QuestionEditor } from "./QuestionEditor";
import { SecretLabel } from "./SecretLabel";
import { useAction } from "./use-action";

interface QuestionListProps {
  examId: string;
  questions: TeacherQuestion[];
  /** false quando a prova já tem submissões ou está encerrada (backend recusa). */
  editable: boolean;
}

export function QuestionList({ examId, questions, editable }: QuestionListProps) {
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [deleting, setDeleting] = useState<TeacherQuestion | null>(null);
  const del = useAction();
  const nextOrder = questions.reduce((max, q) => Math.max(max, q.order), 0) + 1;

  return (
    <div className="flex flex-col gap-4">
      {questions.length === 0 && editing !== "new" ? (
        <div className="rounded-card border border-dashed border-line-strong bg-paper-raised px-6 py-10 text-center">
          <p className="font-bold">Nenhuma questão</p>
          <p className="mt-1 text-sm text-ink-soft">A prova precisa de ao menos uma questão para ser publicada.</p>
        </div>
      ) : null}

      <ol className="flex flex-col gap-4">
        {questions.map((q, index) =>
          editing === q.id ? (
            <li key={q.id}>
              <QuestionEditor examId={examId} question={q} nextOrder={nextOrder} onDone={() => setEditing(null)} />
            </li>
          ) : (
            <li key={q.id} className="rounded-card border border-line bg-paper-raised p-5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-2xl font-bold tabular-nums">{String(index + 1).padStart(2, "0")}</span>
                <Badge>{q.type === "MCQ" ? "Múltipla escolha" : "Discursiva"}</Badge>
                <span className="text-sm text-ink-muted">
                  {q.points.toLocaleString("pt-BR")} {q.points === 1 ? "ponto" : "pontos"} · ordem {q.order}
                </span>
                {editable ? (
                  <span className="ml-auto flex gap-1">
                    <Button variant="ghost" className="px-3 text-sm" onClick={() => setEditing(q.id)}>
                      Editar
                    </Button>
                    <Button variant="ghost" className="px-3 text-sm text-danger" onClick={() => setDeleting(q)}>
                      Excluir
                    </Button>
                  </span>
                ) : null}
              </div>
              <p className="mt-3 leading-relaxed">
                <RichText text={q.statement} codeSize="sm" />
              </p>
              {q.codeSnippet ? (
                <CodeBlock code={q.codeSnippet} language={q.codeLanguage} size="sm" className="mt-3" />
              ) : null}
              {q.type === "MCQ" ? (
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
                        {correct ? <Badge tone="pen">Correta</Badge> : null}
                      </li>
                    );
                  })}
                </ul>
              ) : null}
              {q.answerKey && (q.answerKey.expectedPoints || q.answerKey.rubric || q.answerKey.explanation) ? (
                <div className="mt-3 flex flex-col gap-2 rounded-control border border-dashed border-line-strong bg-paper-sunken/60 p-3 text-sm">
                  <SecretLabel />
                  {q.answerKey.expectedPoints ? <KeyLine label="Pontos esperados" text={q.answerKey.expectedPoints} /> : null}
                  {q.answerKey.rubric ? <KeyLine label="Rubrica" text={q.answerKey.rubric} /> : null}
                  {q.answerKey.explanation ? <KeyLine label="Explicação" text={q.answerKey.explanation} /> : null}
                </div>
              ) : null}
            </li>
          ),
        )}
      </ol>

      {editable ? (
        editing === "new" ? (
          <QuestionEditor examId={examId} nextOrder={nextOrder} onDone={() => setEditing(null)} />
        ) : (
          <div>
            <Button variant="secondary" onClick={() => setEditing("new")}>
              Adicionar questão
            </Button>
          </div>
        )
      ) : null}

      <Modal
        open={deleting !== null}
        busy={del.pending}
        title="Excluir questão?"
        description="A questão, as alternativas e o gabarito dela serão removidos."
        onClose={() => {
          setDeleting(null);
          del.clear();
        }}
        footer={
          <>
            <Button variant="secondary" autoFocus disabled={del.pending} onClick={() => setDeleting(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              loading={del.pending}
              loadingLabel="Excluindo…"
              onClick={() => deleting && del.run(() => deleteQuestionAction(examId, deleting.id), () => setDeleting(null))}
            >
              Excluir
            </Button>
          </>
        }
      >
        {del.result && !del.result.ok ? <Notice tone="danger">{del.result.error}</Notice> : null}
      </Modal>
    </div>
  );
}

function KeyLine({ label, text }: { label: string; text: string }) {
  return (
    <p className="whitespace-pre-wrap">
      <span className="font-medium">{label}: </span>
      <span className="text-ink-soft">{text}</span>
    </p>
  );
}
