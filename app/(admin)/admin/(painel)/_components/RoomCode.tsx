"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/Button";
import { examCode } from "@/lib/exam-code";

/** Código da sala em destaque + modo "projetar" em tela cheia para o quadro/projetor. */
export function RoomCode({ examId, title }: { examId: string; title: string }) {
  const code = examCode(examId);
  const host = useSyncExternalStore(noopSubscribe, () => window.location.host, () => "");
  const [projecting, setProjecting] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (projecting && !el.open) el.showModal();
    if (!projecting && el.open) el.close();
  }, [projecting]);

  return (
    <div className="flex flex-col gap-3">
      <p className="font-mono text-5xl font-medium tracking-[0.2em] text-ink" aria-label={`Código da sala: ${code.split("").join(" ")}`}>
        {code}
      </p>
      <Button variant="secondary" onClick={() => setProjecting(true)}>
        Projetar código
      </Button>

      <dialog
        ref={dialog}
        aria-label="Código da sala em tela cheia"
        onCancel={(e) => {
          e.preventDefault();
          setProjecting(false);
        }}
        className="m-0 h-dvh max-h-none w-screen max-w-none bg-ink p-0 text-on-ink"
      >
        <div className="flex h-full flex-col items-center justify-center gap-8 px-6 text-center">
          <p className="text-[clamp(1.25rem,3vw,2rem)] text-on-ink-muted">{title}</p>
          <p className="text-[clamp(1.5rem,3.5vw,2.5rem)] font-medium">
            Acesse <span className="font-bold">{host}</span> e use o código
          </p>
          <p className="font-mono text-[clamp(4rem,16vw,12rem)] leading-none font-medium tracking-[0.15em]">{code}</p>
          <Button variant="secondary" autoFocus onClick={() => setProjecting(false)}>
            Fechar (Esc)
          </Button>
        </div>
      </dialog>
    </div>
  );
}

function noopSubscribe() {
  return () => {};
}
