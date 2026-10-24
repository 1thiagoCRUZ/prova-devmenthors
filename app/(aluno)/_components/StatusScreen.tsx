import type { ReactNode } from "react";
import { SheetPage, Stamp } from "./SheetPage";

interface StatusScreenProps {
  stamp: string;
  tone?: "pen" | "danger" | "warn";
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
}

/** Telas finais/de erro específicas (tempo esgotado, já enviada, link inválido…). */
export function StatusScreen({ stamp, tone = "pen", title, children, actions }: StatusScreenProps) {
  return (
    <SheetPage title={title}>
      <Stamp tone={tone}>{stamp}</Stamp>
      {children ? <div className="mt-6 space-y-3 text-[1.0625rem] leading-relaxed text-ink-soft">{children}</div> : null}
      {actions ? <div className="mt-8 flex flex-col gap-2 sm:flex-row">{actions}</div> : null}
    </SheetPage>
  );
}

export function TimeUpScreen() {
  return (
    <StatusScreen stamp="Encerrada" tone="danger" title="O tempo acabou">
      <p>
        As respostas que já estavam salvas foram entregues automaticamente. Não é mais possível alterar nem enviar
        respostas.
      </p>
    </StatusScreen>
  );
}

export function AlreadySubmittedScreen({ timeUp = false }: { timeUp?: boolean }) {
  return (
    <StatusScreen
      stamp={timeUp ? "Encerrada" : "Enviada"}
      tone={timeUp ? "danger" : "pen"}
      title={timeUp ? "Esta prova já foi encerrada" : "Esta prova já foi enviada"}
    >
      <p>
        {timeUp
          ? "O tempo desta tentativa acabou e as respostas salvas foram entregues."
          : "Cada e-mail envia a prova uma única vez, e as respostas não podem mais ser alteradas."}
      </p>
      <p>Se achar que isso é um engano, fale com o professor.</p>
    </StatusScreen>
  );
}
