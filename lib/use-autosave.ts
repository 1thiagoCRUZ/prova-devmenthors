"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isApiError, isTransient } from "./api-client";
import { writeDrafts } from "./drafts";
import { saveAnswer, terminalReasonOf, type TerminalReason } from "./student-api";
import type { QuestionType, SaveAnswerPayload } from "./types";

export type SaveState = "pending" | "saving" | "saved" | "error";

interface UseAutosaveOptions {
  examId: string;
  draftKey: string;
  typeOf: (questionId: string) => QuestionType | undefined;
  /** 403/409/401 durante o autosave: a tela inteira precisa mudar de estado. */
  onTerminal: (reason: TerminalReason) => void;
  debounceMs?: number;
}

const MAX_RETRY_DELAY_MS = 30_000;

/**
 * Autosave por questão:
 * - debounce por questão (padrão 800ms);
 * - envios da mesma questão em fila (nunca dois ao mesmo tempo, último valor vence);
 * - o que ainda não foi confirmado fica em sessionStorage e é reenviado após
 *   recarregar a página, ao voltar a conexão ou ao sair da página (keepalive);
 * - erro de rede/servidor tenta de novo com backoff; 403/409 param tudo.
 */
export function useAutosave({ examId, draftKey, typeOf, onTerminal, debounceMs = 800 }: UseAutosaveOptions) {
  const [states, setStates] = useState<Record<string, SaveState>>({});

  const pending = useRef(new Map<string, string | null>());
  const timers = useRef(new Map<string, number>());
  const chains = useRef(new Map<string, Promise<void>>());
  const attempts = useRef(new Map<string, number>());
  const stopped = useRef(false);

  const typeOfRef = useRef(typeOf);
  const onTerminalRef = useRef(onTerminal);
  useEffect(() => {
    typeOfRef.current = typeOf;
    onTerminalRef.current = onTerminal;
  });

  const setState = useCallback((questionId: string, state: SaveState) => {
    setStates((prev) => (prev[questionId] === state ? prev : { ...prev, [questionId]: state }));
  }, []);

  const persist = useCallback(() => {
    writeDrafts(draftKey, Object.fromEntries(pending.current));
  }, [draftKey]);

  const payloadFor = useCallback((questionId: string, value: string | null): SaveAnswerPayload => {
    if (typeOfRef.current(questionId) === "MCQ") return { questionId, selectedOptionId: value };
    return { questionId, text: value === "" ? null : value };
  }, []);

  const clearTimer = useCallback((questionId: string) => {
    const timer = timers.current.get(questionId);
    if (timer !== undefined) window.clearTimeout(timer);
    timers.current.delete(questionId);
  }, []);

  const stop = useCallback(() => {
    stopped.current = true;
    for (const timer of timers.current.values()) window.clearTimeout(timer);
    timers.current.clear();
  }, []);

  // `enqueue` e `sendNow` se chamam (retry); a ref quebra o ciclo de dependências.
  const enqueueRef = useRef<(questionId: string) => Promise<void>>(async () => {});

  const sendNow = useCallback(
    async (questionId: string) => {
      if (stopped.current || !pending.current.has(questionId)) return;
      const value = pending.current.get(questionId) ?? null;
      setState(questionId, "saving");
      try {
        await saveAnswer(examId, payloadFor(questionId, value));
        attempts.current.delete(questionId);
        if (pending.current.has(questionId) && pending.current.get(questionId) === value) {
          pending.current.delete(questionId);
          persist();
          setState(questionId, "saved");
        } else {
          // O aluno mudou a resposta enquanto salvava: já existe outro envio agendado.
          setState(questionId, "pending");
        }
      } catch (err) {
        if (stopped.current) return;
        const reason = terminalReasonOf(err) ?? (isApiError(err, "unauthorized") ? "replaced" : null);
        if (reason) {
          stop();
          onTerminalRef.current(reason);
          return;
        }
        setState(questionId, "error");
        if (isTransient(err)) {
          const attempt = (attempts.current.get(questionId) ?? 0) + 1;
          attempts.current.set(questionId, attempt);
          const delay = Math.min(MAX_RETRY_DELAY_MS, 1000 * 2 ** attempt);
          clearTimer(questionId);
          timers.current.set(
            questionId,
            window.setTimeout(() => {
              timers.current.delete(questionId);
              void enqueueRef.current(questionId);
            }, delay),
          );
        } else {
          // 400/404: reenviar o mesmo valor não vai resolver.
          pending.current.delete(questionId);
          persist();
        }
      }
    },
    [examId, payloadFor, persist, setState, stop, clearTimer],
  );

  const enqueue = useCallback(
    (questionId: string) => {
      const previous = chains.current.get(questionId) ?? Promise.resolve();
      const next = previous.then(() => sendNow(questionId));
      chains.current.set(questionId, next);
      void next.finally(() => {
        if (chains.current.get(questionId) === next) chains.current.delete(questionId);
      });
      return next;
    },
    [sendNow],
  );
  useEffect(() => {
    enqueueRef.current = enqueue;
  }, [enqueue]);

  /** Registra a resposta e agenda o envio. */
  const schedule = useCallback(
    (questionId: string, value: string | null) => {
      if (stopped.current) return;
      pending.current.set(questionId, value);
      persist();
      setState(questionId, "pending");
      clearTimer(questionId);
      timers.current.set(
        questionId,
        window.setTimeout(() => {
          timers.current.delete(questionId);
          void enqueue(questionId);
        }, debounceMs),
      );
    },
    [persist, setState, clearTimer, enqueue, debounceMs],
  );

  /** Reaplica rascunhos não confirmados (vindos do sessionStorage) e reenvia já. */
  const restore = useCallback(
    (drafts: Record<string, string | null>) => {
      for (const [questionId, value] of Object.entries(drafts)) {
        pending.current.set(questionId, value);
        setState(questionId, "pending");
        void enqueue(questionId);
      }
      persist();
    },
    [enqueue, persist, setState],
  );

  /** Envia tudo que estiver pendente agora. `true` se tudo foi confirmado. */
  const flushAll = useCallback(async () => {
    for (const questionId of [...timers.current.keys()]) clearTimer(questionId);
    attempts.current.clear();
    await Promise.all([...pending.current.keys()].map((questionId) => enqueue(questionId)));
    await Promise.all([...chains.current.values()]);
    return pending.current.size === 0;
  }, [clearTimer, enqueue]);

  /** Para de salvar e esquece o que estava pendente (prova encerrada). */
  const discard = useCallback(() => {
    stop();
    pending.current.clear();
    writeDrafts(draftKey, {});
  }, [stop, draftKey]);

  useEffect(() => {
    const retryAll = () => {
      if (stopped.current) return;
      attempts.current.clear();
      for (const questionId of pending.current.keys()) {
        clearTimer(questionId);
        void enqueue(questionId);
      }
    };
    // Saindo da página com algo pendente: dispara com keepalive (o rascunho continua no sessionStorage).
    const onPageHide = () => {
      if (stopped.current) return;
      for (const [questionId, value] of pending.current) {
        void saveAnswer(examId, payloadFor(questionId, value), { keepalive: true }).catch(() => {});
      }
    };
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!stopped.current && pending.current.size > 0) event.preventDefault();
    };

    window.addEventListener("online", retryAll);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("online", retryAll);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [examId, enqueue, clearTimer, payloadFor]);

  useEffect(() => {
    const pendingTimers = timers.current;
    return () => {
      for (const timer of pendingTimers.values()) window.clearTimeout(timer);
    };
  }, []);

  return { states, schedule, restore, flushAll, stop, discard };
}
