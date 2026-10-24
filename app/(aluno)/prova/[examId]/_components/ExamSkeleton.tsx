import { Skeleton } from "@/components/ui/Skeleton";

/** Esqueleto da prova enquanto busca questões/respostas salvas. Mesmo desenho da tela real. */
export function ExamSkeleton({ label = "Carregando sua prova…" }: { label?: string }) {
  return (
    <div className="flex min-h-dvh flex-col bg-paper-sunken" aria-busy="true">
      <div className="bg-ink">
        <div className="mx-auto flex h-20 max-w-[100rem] items-center justify-between gap-4 px-4 sm:px-6">
          <div className="h-5 w-40 animate-skeleton rounded bg-white/15" />
          <div className="h-8 w-24 animate-skeleton rounded bg-white/15" />
        </div>
        <div className="mx-auto max-w-[100rem] px-4 pb-3 sm:px-6">
          <div className="h-1.5 w-full rounded-full bg-white/15" />
        </div>
      </div>

      <div className="mx-auto w-full max-w-[100rem] px-4 py-8 sm:px-6">
        <p role="status" className="mb-5 flex items-center gap-2 text-base text-ink-muted">
          {label}
        </p>
        <div className="flex flex-col gap-5 lg:mr-[20rem]">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-2xl border border-line bg-paper-raised p-5 sm:grid sm:grid-cols-[4.5rem_minmax(0,1fr)] sm:gap-x-5 sm:p-8">
              <Skeleton className="mb-3 h-10 w-12 sm:mb-0" />
              <div className="flex flex-col gap-3">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-4/5" />
                <Skeleton className="mt-2 h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
