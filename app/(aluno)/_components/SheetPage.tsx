import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface SheetPageProps {
  title: string;
  eyebrow?: string;
  children: ReactNode;
}

/**
 * Moldura das telas fora da prova: faixa preta com o título grande e o cartão
 * branco encaixado nela. Uma peça só, centrada, em vez de elementos soltos.
 */
export function SheetPage({ title, eyebrow, children }: SheetPageProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-paper-sunken">
      <header className="bg-ink text-on-ink">
        <div className="mx-auto w-full max-w-xl px-5 pt-6 pb-28 sm:pt-8 sm:pb-36">
          <p className="text-lg font-bold tracking-tight">Provas</p>
          <div className="mt-12 sm:mt-16">
            {eyebrow ? (
              <p className="text-sm font-medium tracking-wide text-on-ink-muted uppercase">{eyebrow}</p>
            ) : null}
            <h1 className="mt-2 text-[clamp(2.25rem,8vw,3.25rem)] leading-[1.02] font-bold tracking-tight text-balance">
              {title}
            </h1>
          </div>
        </div>
      </header>
      <main className="mx-auto -mt-20 w-full max-w-xl flex-1 px-4 pb-12 sm:-mt-24 sm:px-5">
        <div className="animate-fade-in rounded-2xl bg-paper-raised p-6 shadow-[0_24px_60px_-24px_rgb(10_11_15/0.45)] sm:p-9">
          {children}
        </div>
      </main>
    </div>
  );
}

/** Carimbo de estado ("ENVIADA", "ENCERRADA"). */
export function Stamp({ children, tone = "pen" }: { children: ReactNode; tone?: "pen" | "danger" | "warn" }) {
  const color = { pen: "text-pen border-pen", danger: "text-danger border-danger", warn: "text-warn border-warn" }[tone];
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block -rotate-3 rounded-md border-[3px] px-4 py-1.5 font-mono text-lg font-medium tracking-[0.12em] uppercase",
        color,
      )}
    >
      {children}
    </span>
  );
}
