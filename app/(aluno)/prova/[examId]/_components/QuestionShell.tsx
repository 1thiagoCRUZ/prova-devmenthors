import type { ReactNode } from "react";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { RichText } from "@/components/ui/RichText";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/cn";
import type { SaveState } from "@/lib/use-autosave";
import type { StudentQuestion } from "@/lib/types";

interface QuestionShellProps {
  question: StudentQuestion;
  number: number;
  saveState?: SaveState;
  children: ReactNode;
}

export function questionDomId(questionId: string) {
  return `q-${questionId}`;
}

/**
 * Moldura comum das questões, no estilo de formulário: número e tipo numa linha
 * de cabeçalho e o conteúdo ocupando a largura toda do cartão.
 */
export function QuestionShell({ question, number, saveState, children }: QuestionShellProps) {
  const id = questionDomId(question.id);
  return (
    <article
      id={id}
      aria-labelledby={`${id}-number ${id}-statement`}
      className="scroll-mt-36 rounded-2xl border border-line bg-paper-raised p-5 sm:p-8"
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-line pb-4">
        <p id={`${id}-number`} className="text-3xl leading-none font-bold text-pen tabular-nums">
          <span className="sr-only">Questão </span>
          {String(number).padStart(2, "0")}
        </p>
        <span className="text-sm font-medium text-ink-muted">
          {question.type === "MCQ" ? "Múltipla escolha" : "Discursiva"}
          <span aria-hidden="true"> · </span>
          {formatPoints(question.points)} {question.points === 1 ? "ponto" : "pontos"}
        </span>
        <span className="ml-auto">
          <SaveIndicator state={saveState} />
        </span>
      </div>

      <div className="min-w-0">
        <p id={`${id}-statement`} className="mt-5 text-xl leading-relaxed font-medium text-ink">
          <RichText text={question.statement} />
        </p>

        {question.codeSnippet ? (
          <CodeBlock
            code={question.codeSnippet}
            language={question.codeLanguage}
            tabIndex={0}
            role="region"
            aria-label="Trecho de código da questão"
            className="mt-5"
          />
        ) : null}

        <div className="mt-6">{children}</div>
      </div>
    </article>
  );
}

function formatPoints(points: number) {
  return points.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

const labels: Record<SaveState, string> = {
  pending: "Alteração pendente",
  saving: "Salvando…",
  saved: "Salvo",
  error: "Não salvo · tentando de novo",
};

export function SaveIndicator({ state }: { state?: SaveState }) {
  if (!state) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-sm font-medium",
        state === "saved" && "text-ok",
        state === "error" && "text-danger",
        (state === "pending" || state === "saving") && "text-ink-muted",
      )}
    >
      {state === "saving" ? (
        <Spinner />
      ) : (
        <span
          aria-hidden="true"
          className={cn(
            "size-1.5 rounded-full",
            state === "saved" && "bg-ok",
            state === "error" && "bg-danger",
            state === "pending" && "bg-ink-muted",
          )}
        />
      )}
      {labels[state]}
    </span>
  );
}
