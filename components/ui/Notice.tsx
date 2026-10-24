import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "info" | "warn" | "danger" | "ok";

const tones: Record<Tone, string> = {
  info: "border-pen/25 bg-pen-soft",
  warn: "border-warn/25 bg-warn-soft",
  danger: "border-danger/25 bg-danger-soft",
  ok: "border-ok/25 bg-ok-soft",
};

const bars: Record<Tone, string> = {
  info: "bg-pen",
  warn: "bg-warn",
  danger: "bg-danger",
  ok: "bg-ok",
};

/** Mensagem em linha (erro de formulário, aviso). Erro usa role="alert". */
export function Notice({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: Tone;
  title?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn(
        "relative overflow-hidden rounded-control border py-3 pr-4 pl-5 text-sm text-ink",
        tones[tone],
        className,
      )}
    >
      <span aria-hidden="true" className={cn("absolute inset-y-0 left-0 w-1", bars[tone])} />
      {title ? <p className="font-medium">{title}</p> : null}
      {children ? <div className={cn(title && "mt-0.5", "text-ink-soft")}>{children}</div> : null}
    </div>
  );
}
