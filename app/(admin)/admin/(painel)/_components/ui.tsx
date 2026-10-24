import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { Notice } from "@/components/ui/Notice";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";
import { AdminApiError } from "@/lib/admin/api";
import type { ExamStatus, SubmissionStatus } from "@/lib/admin/types";

export function PageHeader({
  back,
  eyebrow,
  title,
  meta,
  actions,
}: {
  back?: { href: string; label: string };
  eyebrow?: string;
  title: string;
  meta?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {back ? (
          <Link href={back.href} className="text-sm font-medium text-pen hover:underline">
            ← {back.label}
          </Link>
        ) : null}
        {eyebrow ? <p className="mt-2 text-xs font-medium tracking-wide text-ink-muted uppercase">{eyebrow}</p> : null}
        <h1 className="mt-1 text-3xl leading-tight font-bold break-words text-balance sm:text-4xl">{title}</h1>
        {meta ? <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-soft">{meta}</div> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function Panel({
  title,
  description,
  children,
  className,
  tone = "default",
}: {
  title?: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
  tone?: "default" | "secret";
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border bg-paper-raised p-5 sm:p-7",
        tone === "secret" ? "border-pen/40" : "border-line",
        className,
      )}
    >
      {title ? <h2 className="text-xl font-bold">{title}</h2> : null}
      {description ? <div className="mt-1 text-sm text-ink-soft">{description}</div> : null}
      <div className={cn(title || description ? "mt-4" : undefined)}>{children}</div>
    </section>
  );
}

const examStatus: Record<ExamStatus, { label: string; tone: "neutral" | "pen" | "danger" }> = {
  DRAFT: { label: "Rascunho", tone: "neutral" },
  PUBLISHED: { label: "Publicada", tone: "pen" },
  CLOSED: { label: "Encerrada", tone: "danger" },
};

export function ExamStatusBadge({ status }: { status: ExamStatus }) {
  const s = examStatus[status];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

const submissionStatus: Record<SubmissionStatus, { label: string; tone: "neutral" | "warn" | "ok" }> = {
  IN_PROGRESS: { label: "Fazendo", tone: "neutral" },
  SUBMITTED: { label: "Enviada", tone: "warn" },
  GRADED: { label: "Corrigida", tone: "ok" },
};

export function SubmissionStatusBadge({ status }: { status: SubmissionStatus }) {
  const s = submissionStatus[status];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export function PageSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-6">
      <p role="status" className="sr-only">
        Carregando…
      </p>
      <Skeleton className="h-9 w-2/3 max-w-md" />
      <Skeleton className="h-4 w-48" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-36 w-full rounded-card" />
        ))}
      </div>
    </div>
  );
}

/** Erro da API em página do painel (o 401 já foi para o login). */
export function ApiErrorNotice({ error }: { error: unknown }) {
  if (!(error instanceof AdminApiError)) throw error;
  return (
    <Notice tone="danger" title={error.status === 404 ? "Não encontrado" : "Não foi possível carregar"}>
      {error.message}
    </Notice>
  );
}

export function formatScore(n: number | null | undefined) {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}
