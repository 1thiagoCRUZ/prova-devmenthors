import { cn } from "@/lib/cn";

export function ProgressBar({
  value,
  max,
  label,
  className,
  tone = "pen",
}: {
  value: number;
  max: number;
  label: string;
  className?: string;
  tone?: "pen" | "on-ink";
}) {
  const ratio = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className={cn(
        "h-1.5 w-full overflow-hidden rounded-full",
        tone === "pen" ? "bg-paper-sunken" : "bg-white/15",
        className,
      )}
    >
      {/* Só transform: anima sem layout. */}
      <div
        className={cn(
          "h-full w-full origin-left rounded-full transition-transform duration-300 ease-out",
          tone === "pen" ? "bg-pen" : "bg-on-ink",
        )}
        style={{ transform: `scaleX(${ratio})` }}
      />
    </div>
  );
}
