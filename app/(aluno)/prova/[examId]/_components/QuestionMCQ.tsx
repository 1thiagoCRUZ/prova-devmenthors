import { Button } from "@/components/ui/Button";
import { RadioCard } from "@/components/ui/RadioCard";
import type { SaveState } from "@/lib/use-autosave";
import type { StudentQuestion } from "@/lib/types";
import { QuestionShell, questionDomId } from "./QuestionShell";

interface QuestionMCQProps {
  question: StudentQuestion;
  number: number;
  value: string | null;
  saveState?: SaveState;
  disabled: boolean;
  onChange: (optionId: string | null) => void;
}

export function QuestionMCQ({ question, number, value, saveState, disabled, onChange }: QuestionMCQProps) {
  const id = questionDomId(question.id);
  return (
    <QuestionShell question={question} number={number} saveState={saveState}>
      <div role="radiogroup" aria-labelledby={`${id}-number ${id}-statement`} className="flex flex-col gap-2.5">
        {question.options.map((option) => (
          <RadioCard
            key={option.id}
            name={id}
            value={option.id}
            letter={option.label}
            text={option.text}
            checked={value === option.id}
            disabled={disabled}
            onChange={() => onChange(option.id)}
          />
        ))}
      </div>
      {value ? (
        <Button variant="ghost" className="mt-2 -ml-2 text-sm" disabled={disabled} onClick={() => onChange(null)}>
          Limpar resposta
        </Button>
      ) : null}
    </QuestionShell>
  );
}
