"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Notice } from "@/components/ui/Notice";
import { setExamStatusAction } from "@/lib/admin/actions";
import type { ExamStatus } from "@/lib/admin/types";
import { useAction } from "./use-action";

const transitions: Record<
  ExamStatus,
  { to: ExamStatus; label: string; title: string; body: string; variant: "primary" | "secondary" | "danger" }[]
> = {
  DRAFT: [
    {
      to: "PUBLISHED",
      label: "Publicar",
      title: "Publicar a prova?",
      body: "Alunos poderão entrar dentro do horário definido. Depois que alguém começar, as questões e o gabarito ficam travados.",
      variant: "primary",
    },
  ],
  PUBLISHED: [
    {
      to: "DRAFT",
      label: "Voltar a rascunho",
      title: "Voltar para rascunho?",
      body: "Só é possível enquanto ninguém começou a prova. Alunos deixam de conseguir entrar.",
      variant: "secondary",
    },
    {
      to: "CLOSED",
      label: "Encerrar",
      title: "Encerrar a prova?",
      body: "Ninguém mais entra nem responde; tentativas em andamento são entregues automaticamente. Uma prova encerrada não pode ser reaberta nem editada.",
      variant: "danger",
    },
  ],
  CLOSED: [],
};

export function ExamStatusActions({ examId, status }: { examId: string; status: ExamStatus }) {
  const [confirming, setConfirming] = useState<(typeof transitions)[ExamStatus][number] | null>(null);
  const { pending, result, run, clear } = useAction();

  return (
    <>
      {transitions[status].map((t) => (
        <Button key={t.to} variant={t.variant} onClick={() => setConfirming(t)}>
          {t.label}
        </Button>
      ))}
      <Modal
        open={confirming !== null}
        busy={pending}
        title={confirming?.title ?? ""}
        description={confirming?.body}
        onClose={() => {
          setConfirming(null);
          clear();
        }}
        footer={
          <>
            <Button
              variant="secondary"
              autoFocus
              disabled={pending}
              onClick={() => {
                setConfirming(null);
                clear();
              }}
            >
              Cancelar
            </Button>
            <Button
              variant={confirming?.variant === "danger" ? "danger" : "primary"}
              loading={pending}
              loadingLabel="Aplicando…"
              onClick={() => confirming && run(() => setExamStatusAction(examId, confirming.to), () => setConfirming(null))}
            >
              {confirming?.label}
            </Button>
          </>
        }
      >
        {result && !result.ok ? <Notice tone="danger">{result.error}</Notice> : null}
      </Modal>
    </>
  );
}
