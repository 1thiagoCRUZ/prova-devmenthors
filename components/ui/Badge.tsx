import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "ok" | "warn" | "danger" | "pen";

const tones: Record<Tone, string> = {
  neutral: "bg-paper-sunken text-ink-soft",
  ok: "bg-ok-soft text-ok",
  warn: "bg-warn-soft text-warn",
  danger: "bg-danger-soft text-danger",
  pen: "bg-pen-soft text-pen",
};

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
