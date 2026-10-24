"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { saveQuestionAction } from "@/lib/admin/actions";
import {
  CODE_LANGUAGES,
  LABELS,
  questionInputSchema,
  type CodeLanguage,
  type QuestionInput,
} from "@/lib/admin/schemas";
import type { TeacherQuestion } from "@/lib/admin/types";
import { cn } from "@/lib/cn";
import { SecretLabel } from "./SecretLabel";
import { useAction } from "./use-action";

const LANGUAGE_LABELS: Record<CodeLanguage, string> = {
  php: "PHP",
  sql: "SQL",
  html: "HTML",
  css: "CSS",
  javascript: "JavaScript",
  typescript: "TypeScript",
  json: "JSON",
  python: "Python",
  java: "Java",
  c: "C",
  cpp: "C++",
  csharp: "C#",
  bash: "Bash",
  plaintext: "Texto puro",
};

const FORMAT_HINT = (
  <>
    Código no meio do texto entre crases: <code className="font-mono">{'`$_GET["busca"]`'}</code>. Bloco de código:{" "}
    <code className="font-mono">```php</code> numa linha, o código, e <code className="font-mono">```</code> para fechar.
  </>
);

interface QuestionEditorProps {
  examId: string;
  question?: TeacherQuestion;
  nextOrder: number;
  onDone: () => void;
}

function initialState(question: TeacherQuestion | undefined, nextOrder: number): QuestionInput {
  if (!question) {
    return {
      type: "MCQ",
      order: nextOrder,
      statement: "",
      codeSnippet: "",
      codeLanguage: "",
      points: 1,
      options: [
        { label: "A", text: "" },
        { label: "B", text: "" },
        { label: "C", text: "" },
        { label: "D", text: "" },
      ],
      correctOptionLabel: null,
      expectedPoints: "",
      rubric: "",
      explanation: "",
    };
  }
  const correct = question.options.find((o) => o.id === question.answerKey?.correctOptionId);
  return {
    type: question.type,
    order: question.order,
    statement: question.statement,
    codeSnippet: question.codeSnippet ?? "",
    codeLanguage: CODE_LANGUAGES.includes(question.codeLanguage as CodeLanguage)
      ? (question.codeLanguage as CodeLanguage)
      : "",
    points: question.points,
    options: question.options.map((o) => ({ label: o.label as QuestionInput["options"][number]["label"], text: o.text })),
    correctOptionLabel: (correct?.label as QuestionInput["correctOptionLabel"]) ?? null,
    expectedPoints: question.answerKey?.expectedPoints ?? "",
    rubric: question.answerKey?.rubric ?? "",
    explanation: question.answerKey?.explanation ?? "",
  };
}

export function QuestionEditor({ examId, question, nextOrder, onDone }: QuestionEditorProps) {
  const [form, setForm] = useState<QuestionInput>(() => initialState(question, nextOrder));
  const [pointsText, setPointsText] = useState(String(form.points).replace(".", ","));
  const [clientError, setClientError] = useState<string | null>(null);
  const { pending, result, run } = useAction();
  const groupName = useId();

  const set = <K extends keyof QuestionInput>(key: K, value: QuestionInput[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // Rótulos sempre A, B, C… na ordem; o gabarito acompanha a alternativa ao remover.
  const relabel = (options: { text: string }[]) =>
    options.map((o, i) => ({ label: LABELS[i], text: o.text }));

  const removeOption = (index: number) => {
    const removedLabel = form.options[index].label;
    const next = relabel(form.options.filter((_, i) => i !== index));
    let correct = form.correctOptionLabel;
    if (correct === removedLabel) correct = null;
    else if (correct && LABELS.indexOf(correct) > index) correct = LABELS[LABELS.indexOf(correct) - 1];
    setForm((prev) => ({ ...prev, options: next, correctOptionLabel: correct }));
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const points = Number(pointsText.replace(",", "."));
    const input = { ...form, points, options: form.type === "MCQ" ? form.options : [] };
    const parsed = questionInputSchema.safeParse(input);
    if (!parsed.success) {
      setClientError(parsed.error.issues[0]?.message ?? "Confira os campos");
      return;
    }
    setClientError(null);
    run(() => saveQuestionAction(examId, question?.id ?? null, parsed.data), onDone);
  };

  const error = clientError ?? (result && !result.ok ? result.error : null);

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5 rounded-card border border-pen/40 bg-paper-raised p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-bold">{question ? "Editar questão" : "Nova questão"}</h3>
        {question ? null : (
          <div role="radiogroup" aria-label="Tipo da questão" className="flex rounded-control border border-line-strong p-0.5">
            {(["MCQ", "DISCURSIVE"] as const).map((type) => (
              <label
                key={type}
                className={cn(
                  "cursor-pointer rounded-[0.5rem] px-3 py-1.5 text-sm font-medium has-focus-visible:outline-2 has-focus-visible:outline-pen",
                  form.type === type ? "bg-ink text-on-ink" : "text-ink-soft hover:text-ink",
                )}
              >
                <input
                  type="radio"
                  className="sr-only"
                  name={`${groupName}-type`}
                  checked={form.type === type}
                  onChange={() => set("type", type)}
                />
                {type === "MCQ" ? "Múltipla escolha" : "Discursiva"}
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Ordem"
          type="number"
          min={1}
          value={form.order}
          onChange={(e) => set("order", Number(e.target.value))}
          disabled={pending}
        />
        <Input
          label="Pontos"
          inputMode="decimal"
          value={pointsText}
          onChange={(e) => setPointsText(e.target.value)}
          disabled={pending}
        />
      </div>

      <Textarea
        label="Enunciado"
        className="min-h-28"
        value={form.statement}
        onChange={(e) => set("statement", e.target.value)}
        disabled={pending}
        hint={FORMAT_HINT}
      />
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <Textarea
          label="Trecho de código (opcional)"
          className="min-h-20 font-mono text-sm"
          spellCheck={false}
          value={form.codeSnippet}
          onChange={(e) => set("codeSnippet", e.target.value)}
          disabled={pending}
        />
        <Select
          label="Linguagem"
          value={form.codeLanguage}
          onChange={(e) => set("codeLanguage", e.target.value as QuestionInput["codeLanguage"])}
          disabled={pending || !form.codeSnippet.trim()}
        >
          <option value="">Texto puro</option>
          {CODE_LANGUAGES.filter((l) => l !== "plaintext").map((l) => (
            <option key={l} value={l}>
              {LANGUAGE_LABELS[l]}
            </option>
          ))}
        </Select>
      </div>

      {form.type === "MCQ" ? (
        <fieldset className="flex flex-col gap-2.5">
          <legend className="mb-2 text-sm font-medium">
            Alternativas <span className="font-normal text-ink-muted">· marque a correta · aceitam a mesma formatação do enunciado</span>
          </legend>
          {form.options.map((option, index) => (
            <div key={option.label} className="flex items-start gap-2">
              <label
                className={cn(
                  "mt-1.5 grid size-9 shrink-0 cursor-pointer place-items-center rounded-full border-2 font-mono text-sm font-medium transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-pen",
                  form.correctOptionLabel === option.label
                    ? "border-pen bg-pen text-white"
                    : "border-line-strong text-ink-soft hover:border-ink",
                )}
              >
                <input
                  type="radio"
                  className="sr-only"
                  name={`${groupName}-correct`}
                  checked={form.correctOptionLabel === option.label}
                  onChange={() => set("correctOptionLabel", option.label)}
                  disabled={pending}
                />
                <span className="sr-only">Marcar {option.label} como correta</span>
                <span aria-hidden="true">{option.label}</span>
              </label>
              <div className="flex-1">
                <Input
                  label={`Texto da alternativa ${option.label}`}
                  hideLabel
                  value={option.text}
                  onChange={(e) =>
                    set(
                      "options",
                      form.options.map((o, i) => (i === index ? { ...o, text: e.target.value } : o)),
                    )
                  }
                  disabled={pending}
                />
              </div>
              <Button
                variant="ghost"
                className="mt-0.5 shrink-0 px-3"
                aria-label={`Remover alternativa ${option.label}`}
                disabled={pending || form.options.length <= 2}
                onClick={() => removeOption(index)}
              >
                Remover
              </Button>
            </div>
          ))}
          <div>
            <Button
              variant="secondary"
              disabled={pending || form.options.length >= 10}
              onClick={() => set("options", relabel([...form.options, { text: "" }]))}
            >
              Adicionar alternativa
            </Button>
          </div>
        </fieldset>
      ) : null}

      <div className="flex flex-col gap-4 rounded-control border border-dashed border-line-strong bg-paper-sunken/60 p-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold">Gabarito e correção</span>
          <SecretLabel />
        </div>
        {form.type === "DISCURSIVE" ? (
          <>
            <Textarea
              label="Pontos esperados na resposta"
              className="min-h-20"
              value={form.expectedPoints}
              onChange={(e) => set("expectedPoints", e.target.value)}
              disabled={pending}
            />
            <Textarea
              label="Rubrica de correção"
              className="min-h-20"
              value={form.rubric}
              onChange={(e) => set("rubric", e.target.value)}
              disabled={pending}
            />
          </>
        ) : (
          <p className="text-sm text-ink-soft">
            Correta:{" "}
            <strong className="text-ink">{form.correctOptionLabel ?? "nenhuma marcada"}</strong>. A correção da múltipla
            escolha é automática no envio.
          </p>
        )}
        <Textarea
          label="Explicação (opcional)"
          className="min-h-16"
          value={form.explanation}
          onChange={(e) => set("explanation", e.target.value)}
          disabled={pending}
        />
      </div>

      {error ? <Notice tone="danger">{error}</Notice> : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" loading={pending} loadingLabel="Salvando…">
          {question ? "Salvar questão" : "Adicionar questão"}
        </Button>
        <Button variant="ghost" disabled={pending} onClick={onDone}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
