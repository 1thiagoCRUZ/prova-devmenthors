"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

interface TimerProps {
  /** expiresAt devolvido pelo backend (nunca calculado a partir de durationMinutes). */
  expiresAt: string;
  /** Diferença relógio do servidor − relógio do browser, estimada pelo header Date. */
  clockOffset: number;
  onExpire: () => void;
}

const ANNOUNCE_AT_MINUTES = [10, 5, 1];

/**
 * Só exibe a contagem. Quando chega a zero avisa o pai, que pergunta ao
 * backend (quem decide se acabou mesmo).
 */
export function Timer({ expiresAt, clockOffset, onExpire }: TimerProps) {
  const deadline = Date.parse(expiresAt);
  const [remaining, setRemaining] = useState(() => deadline - (Date.now() + clockOffset));
  const [announcement, setAnnouncement] = useState("");

  const onExpireRef = useRef(onExpire);
  useEffect(() => {
    onExpireRef.current = onExpire;
  });

  useEffect(() => {
    let fired = false;
    const tick = () => {
      const left = deadline - (Date.now() + clockOffset);
      setRemaining(left);
      if (left <= 0 && !fired) {
        fired = true;
        onExpireRef.current();
      }
    };
    tick();
    const interval = window.setInterval(tick, 500);
    // Aba em segundo plano congela timers: ao voltar, recalcula na hora.
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [deadline, clockOffset]);

  const seconds = Math.max(0, Math.ceil(remaining / 1000));
  const minutesLeft = Math.ceil(seconds / 60);

  // Avisa leitores de tela só em marcos (10, 5 e 1 min), nunca a cada segundo.
  const lastAnnounced = useRef<number | null>(null);
  useEffect(() => {
    const mark = ANNOUNCE_AT_MINUTES.find((m) => minutesLeft === m && seconds > 0);
    if (mark !== undefined && lastAnnounced.current !== mark) {
      lastAnnounced.current = mark;
      setAnnouncement(mark === 1 ? "Falta 1 minuto para o fim da prova." : `Faltam ${mark} minutos para o fim da prova.`);
    }
  }, [minutesLeft, seconds]);

  const tone = seconds <= 60 ? "danger" : seconds <= 5 * 60 ? "warn" : "normal";

  return (
    <div className="flex flex-col items-end leading-none">
      <span aria-hidden="true" className="text-xs font-medium tracking-wide whitespace-nowrap text-on-ink-muted uppercase">
        <span className="sm:hidden">Restam</span>
        <span className="hidden sm:inline">Tempo restante</span>
      </span>
      <span
        role="timer"
        aria-label={`Tempo restante: ${spoken(seconds)}`}
        className={cn(
          "mt-1 font-mono text-[2rem] font-medium tabular-nums transition-colors duration-300 sm:text-[2.5rem]",
          tone === "normal" && "text-on-ink",
          tone === "warn" && "text-warn-on-ink",
          tone === "danger" && "text-danger-on-ink",
        )}
      >
        {format(seconds)}
      </span>
      <span aria-live="polite" className="sr-only">
        {announcement}
      </span>
    </div>
  );
}

function format(total: number) {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function spoken(total: number) {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const parts = [];
  if (h > 0) parts.push(`${h} hora${h > 1 ? "s" : ""}`);
  if (m > 0 || h > 0) parts.push(`${m} minuto${m === 1 ? "" : "s"}`);
  if (h === 0 && m === 0) parts.push(`${total} segundo${total === 1 ? "" : "s"}`);
  return parts.join(" e ");
}
