"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { addAssignmentsAction, removeAssignmentAction } from "@/lib/admin/actions";
import type { Assignment } from "@/lib/admin/types";
import { useAction } from "./use-action";

export function AssignmentsPanel({ examId, assignments, readOnly }: { examId: string; assignments: Assignment[]; readOnly: boolean }) {
  const [emails, setEmails] = useState("");
  const add = useAction();
  const remove = useAction();
  const [removingId, setRemovingId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-ink-soft">
        {assignments.length === 0
          ? "Sem lista: qualquer e-mail com o link pode fazer a prova."
          : `Só estes ${assignments.length} e-mail(s) podem fazer a prova.`}
      </p>

      {readOnly ? null : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            add.run(() => addAssignmentsAction(examId, emails), () => setEmails(""));
          }}
          className="flex flex-col gap-3"
        >
          <Textarea
            label="Liberar e-mails"
            className="min-h-24"
            placeholder="um@exemplo.com, outro@exemplo.com"
            hint="Separe por vírgula, espaço ou linha."
            value={emails}
            onChange={(e) => setEmails(e.target.value)}
            disabled={add.pending}
          />
          {add.result && !add.result.ok ? <Notice tone="danger">{add.result.error}</Notice> : null}
          {add.result?.ok && add.result.message ? <Notice tone="ok">{add.result.message}</Notice> : null}
          <div>
            <Button type="submit" variant="secondary" loading={add.pending} loadingLabel="Liberando…" disabled={!emails.trim()}>
              Liberar
            </Button>
          </div>
        </form>
      )}

      {assignments.length > 0 ? (
        <ul className="flex max-h-72 flex-col divide-y divide-line overflow-y-auto rounded-control border border-line">
          {assignments.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-2 px-3 py-1.5 text-sm">
              <span className="min-w-0 truncate">{a.email}</span>
              {readOnly ? null : (
                <Button
                  variant="ghost"
                  className="min-h-9 shrink-0 px-2 text-sm"
                  aria-label={`Remover ${a.email}`}
                  loading={remove.pending && removingId === a.id}
                  disabled={remove.pending}
                  onClick={() => {
                    setRemovingId(a.id);
                    remove.run(() => removeAssignmentAction(examId, a.id));
                  }}
                >
                  Remover
                </Button>
              )}
            </li>
          ))}
        </ul>
      ) : null}
      {remove.result && !remove.result.ok ? <Notice tone="danger">{remove.result.error}</Notice> : null}
    </div>
  );
}
