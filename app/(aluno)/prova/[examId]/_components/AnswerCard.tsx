import { cn } from "@/lib/cn";
import type { SaveState } from "@/lib/use-autosave";
import type { StudentQuestion } from "@/lib/types";
import { questionDomId } from "./QuestionShell";

interface AnswerCardProps {
  questions: StudentQuestion[];
  isAnswered: (questionId: string) => boolean;
  saveStates: Record<string, SaveState>;
  headingId: string;
}

/** Cartão-resposta: uma casa por questão, preenchida quando respondida. Cada casa leva à questão. */
export function AnswerCard({ questions, isAnswered, saveStates, headingId }: AnswerCardProps) {
  return (
    <nav aria-labelledby={headingId}>
      <h2 id={headingId} className="text-sm font-bold tracking-wide text-ink uppercase">
        Cartão-resposta
      </h2>
      <ol className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(3rem,1fr))] gap-2">
        {questions.map((question, index) => {
          const answered = isAnswered(question.id);
          const failed = saveStates[question.id] === "error";
          return (
            <li key={question.id}>
              <a
                href={`#${questionDomId(question.id)}`}
                aria-label={`Questão ${index + 1}, ${answered ? "respondida" : "em branco"}${failed ? ", não salva" : ""}`}
                className={cn(
                  "grid size-12 place-items-center rounded-control border-[1.5px] font-mono text-base font-medium tabular-nums transition-colors duration-150",
                  answered
                    ? "border-pen bg-pen text-white hover:bg-pen-hover"
                    : "border-line-strong bg-paper-raised text-ink-soft hover:border-ink hover:text-ink",
                  failed && "ring-2 ring-danger ring-offset-1 ring-offset-paper",
                )}
              >
                {index + 1}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
