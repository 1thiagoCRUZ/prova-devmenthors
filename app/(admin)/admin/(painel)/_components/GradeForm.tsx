"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { gradeAnswerAction } from "@/lib/admin/actions";
import { useAction } from "./use-action";

interface GradeFormProps {
  examId: string;
  submissionId: string;
  answerId: string;
  maxPoints: number;
  current: number | null;
}

export function GradeForm({ examId, submissionId, answerId, maxPoints, current }: GradeFormProps) {
  const [value, setValue] = useState(current === null ? "" : String(current).replace(".", ","));
  const [clientError, setClientError] = useState<string | null>(null);
  const { pending, result, run } = useAction();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const score = Number(value.replace(",", "."));
        if (!value.trim() || Number.isNaN(score)) return setClientError("Informe a nota");
        if (score < 0 || score > maxPoints) return setClientError(`A nota vai de 0 a ${maxPoints.toLocaleString("pt-BR")}`);
        setClientError(null);
        run(() => gradeAnswerAction(examId, submissionId, answerId, score));
      }}
      className="flex flex-col gap-2"
    >
      <div className="flex items-end gap-2">
        <div className="w-32">
          <Input
            label={`Nota (0 a ${maxPoints.toLocaleString("pt-BR")})`}
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={pending}
          />
        </div>
        <Button type="submit" loading={pending} loadingLabel="Salvando…">
          {current === null ? "Dar nota" : "Atualizar nota"}
        </Button>
      </div>
      {clientError ? <Notice tone="danger">{clientError}</Notice> : null}
      {result && !result.ok ? <Notice tone="danger">{result.error}</Notice> : null}
      {result?.ok ? <Notice tone="ok">{result.message ?? "Nota salva."}</Notice> : null}
    </form>
  );
}
