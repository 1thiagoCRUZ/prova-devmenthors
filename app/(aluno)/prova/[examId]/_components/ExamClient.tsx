"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { use, useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { isApiError, isTransient } from "@/lib/api-client";
import { clearExamDrafts } from "@/lib/drafts";
import { subscribeExamEvents } from "@/lib/exam-channel";
import { isExamId } from "@/lib/exam-id";
import { getExamSession, terminalReasonOf, wasClosedByTime, type TerminalReason } from "@/lib/student-api";
import { SheetPage } from "../../../_components/SheetPage";
import { StartForm } from "../../../_components/StartForm";
import { AlreadySubmittedScreen, StatusScreen, TimeUpScreen } from "../../../_components/StatusScreen";
import { ExamForm } from "./ExamForm";
import { ExamSkeleton } from "./ExamSkeleton";

export function ExamClient({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = use(params);
  if (!isExamId(examId)) {
    return (
      <StatusScreen
        stamp="Link inválido"
        tone="warn"
        title="Não encontramos esta prova"
        actions={
          <Link
            href="/"
            className="inline-flex min-h-14 w-full items-center justify-center rounded-control bg-pen px-6 text-lg font-medium text-white hover:bg-pen-hover sm:w-auto"
          >
            Entrar com o código da sala
          </Link>
        }
      >
        <p>Confira se o link foi copiado inteiro.</p>
      </StatusScreen>
    );
  }
  return <ExamFlow examId={examId.toLowerCase()} />;
}

const VERIFY_RETRY_MS = 5000;

function ExamFlow({ examId }: { examId: string }) {
  const queryClient = useQueryClient();
  const queryKey = ["exam-session", examId] as const;

  const session = useQuery({
    queryKey,
    queryFn: () => getExamSession(examId),
    retry: (count, err) => isTransient(err) && count < 2,
    gcTime: 0,
  });

  const [terminal, setTerminal] = useState<TerminalReason | null>(null);
  const [closedOnStart, setClosedOnStart] = useState<{ timeUp: boolean } | null>(null);
  const [verifyingTime, setVerifyingTime] = useState(false);

  // Último expiresAt/offset conhecidos, para saber se um 401 é "cookie expirou" (tempo acabou).
  const timing = useRef<{ expiresAt: number; offset: number } | null>(null);
  useEffect(() => {
    if (!session.data) return;
    timing.current = {
      expiresAt: Date.parse(session.data.data.submission.expiresAt),
      offset: session.data.clockOffset ?? 0,
    };
  }, [session.data]);

  const handleTerminal = useCallback(
    (reason: TerminalReason) => {
      // Depois do fim do tempo o backend nem sempre responde 403: o cookie expira junto com a
      // tentativa (401 → "replaced") e, se o cron já fechou a submissão, o autosave recebe 409.
      const t = timing.current;
      const locallyExpired = !!t && Date.now() + t.offset >= t.expiresAt;
      const effective = reason !== "time-up" && locallyExpired ? "time-up" : reason;
      if (effective !== "replaced") clearExamDrafts(examId);
      setVerifyingTime(false);
      setTerminal(effective);
    },
    [examId],
  );

  // Fim do tempo no relógio local: quem confirma é o backend (GET /questions → 403).
  const { refetch } = session;
  const retryTimer = useRef<number | undefined>(undefined);
  const alive = useRef(true);
  const verifyTime = useCallback(async () => {
    setVerifyingTime(true);
    // Uma rodada por vez; se o backend ainda aceitar, tenta de novo em alguns segundos.
    while (alive.current) {
      const result = await refetch();
      if (result.isError) {
        const err = result.error;
        const reason = terminalReasonOf(err);
        if (reason) return handleTerminal(reason);
        if (isApiError(err, "unauthorized")) return handleTerminal("time-up");
      } else if (result.data) {
        const { submission } = result.data.data;
        if (submission.readOnly) return handleTerminal("time-up");
        const left = Date.parse(submission.expiresAt) - (Date.now() + (result.data.clockOffset ?? 0));
        if (left > 0) {
          // Relógio do aparelho estava adiantado: o backend ainda aceita respostas.
          setVerifyingTime(false);
          return;
        }
      }
      await new Promise((resolve) => {
        retryTimer.current = window.setTimeout(resolve, VERIFY_RETRY_MS);
      });
    }
  }, [refetch, handleTerminal]);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      window.clearTimeout(retryTimer.current);
    };
  }, []);

  // Outra aba deste navegador iniciou/enviou esta prova: o cookie é compartilhado.
  const phaseRef = useRef<string>("loading");
  useEffect(
    () =>
      subscribeExamEvents(examId, (msg) => {
        if (phaseRef.current === "taking") {
          setTerminal(msg.type === "submitted" ? "submitted" : "replaced");
        } else if (phaseRef.current === "entry") {
          void queryClient.resetQueries({ queryKey });
        }
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [examId, queryClient],
  );

  const reenter = () => {
    setTerminal(null);
    setClosedOnStart(null);
    void queryClient.resetQueries({ queryKey });
  };

  // ---- Decide a tela ----
  let phase: "loading" | "entry" | "taking" | "time-up" | "submitted" | "closed" | "load-error";
  let replacedNotice = false;
  if (closedOnStart) phase = "closed";
  else if (terminal === "time-up") phase = "time-up";
  else if (terminal === "submitted") phase = "submitted";
  else if (terminal === "replaced") {
    phase = "entry";
    replacedNotice = true;
  } else if (session.isPending) phase = "loading";
  else if (session.isError) {
    const reason = terminalReasonOf(session.error);
    if (isApiError(session.error, "unauthorized")) phase = "entry";
    else if (reason === "replaced") {
      phase = "entry";
      replacedNotice = true;
    } else if (reason === "time-up") phase = "time-up";
    else phase = "load-error";
  } else if (session.data.data.submission.readOnly) phase = "submitted";
  else phase = "taking";

  useEffect(() => {
    phaseRef.current = phase;
  });

  if (phase === "loading") return <ExamSkeleton />;
  if (phase === "time-up") return <TimeUpScreen />;
  if (phase === "closed") return <AlreadySubmittedScreen timeUp={closedOnStart?.timeUp} />;
  if (phase === "submitted") {
    const sub = session.data?.data.submission;
    return <AlreadySubmittedScreen timeUp={sub ? wasClosedByTime(sub) : false} />;
  }

  if (phase === "load-error") {
    return (
      <StatusScreen
        stamp="Sem conexão"
        tone="warn"
        title="Não foi possível carregar a prova"
        actions={
          <Button loading={session.isFetching} loadingLabel="Tentando…" onClick={() => void session.refetch()}>
            Tentar de novo
          </Button>
        }
      >
        <p>Suas respostas já salvas não foram perdidas. Verifique sua internet e tente de novo.</p>
      </StatusScreen>
    );
  }

  if (phase === "entry") {
    return (
      <SheetPage eyebrow="Prova online" title={replacedNotice ? "Continuar a prova" : "Entrar na prova"}>
        <div className="flex flex-col gap-6">
          {replacedNotice ? (
            <Notice tone="warn" title="Esta prova foi aberta em outra aba ou aparelho">
              Para evitar respostas misturadas, esta aba parou de salvar. Entre de novo com seu e-mail para continuar
              aqui: suas respostas salvas continuam lá.
            </Notice>
          ) : null}
          <StartForm
            examId={examId}
            submitLabel={replacedNotice ? "Continuar aqui" : "Entrar"}
            onInProgress={reenter}
            onClosed={(_, result) => setClosedOnStart({ timeUp: wasClosedByTime(result) })}
          />
        </div>
      </SheetPage>
    );
  }

  const { data } = session;
  if (!data) return <ExamSkeleton />;
  return (
    <ExamForm
      key={data.data.submission.startedAt}
      examId={examId}
      session={data.data}
      clockOffset={data.clockOffset ?? 0}
      onTerminal={handleTerminal}
      onTimeElapsed={() => void verifyTime()}
      verifyingTime={verifyingTime}
    />
  );
}
