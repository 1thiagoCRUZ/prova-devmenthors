import { cn } from "@/lib/cn";

/** Bloco de carregamento. Pulsa devagar; com reduced-motion fica estático. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-skeleton rounded-control bg-paper-sunken", className)} />;
}
