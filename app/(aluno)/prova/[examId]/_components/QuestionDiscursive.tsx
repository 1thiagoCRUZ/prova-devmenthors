import { Textarea } from "@/components/ui/Field";
import type { SaveState } from "@/lib/use-autosave";
import type { StudentQuestion } from "@/lib/types";
import { QuestionShell } from "./QuestionShell";

/** Mesmo limite do SaveAnswerDto.text no backend. */
const MAX_LENGTH = 20_000;

interface QuestionDiscursiveProps {
  question: StudentQuestion;
  number: number;
  value: string;
  saveState?: SaveState;
  disabled: boolean;
  onChange: (text: string) => void;
}

export function QuestionDiscursive({ question, number, value, saveState, disabled, onChange }: QuestionDiscursiveProps) {
  return (
    <QuestionShell question={question} number={number} saveState={saveState}>
      <Textarea
        label={`Sua resposta para a questão ${number}`}
        hideLabel
        value={value}
        maxLength={MAX_LENGTH}
        disabled={disabled}
        placeholder="Escreva sua resposta…"
        spellCheck
        hint={
          <span className="tabular-nums">
            {value.length.toLocaleString("pt-BR")} / {MAX_LENGTH.toLocaleString("pt-BR")} caracteres
          </span>
        }
        onChange={(event) => onChange(event.target.value)}
      />
    </QuestionShell>
  );
}
