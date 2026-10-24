import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "./Spinner";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary:
    "bg-pen text-white hover:bg-pen-hover active:translate-y-px disabled:bg-line-strong disabled:text-paper-raised",
  secondary:
    "border border-line-strong bg-paper-raised text-ink hover:border-ink hover:bg-white active:translate-y-px disabled:border-line disabled:text-ink-muted",
  ghost: "text-ink-soft hover:bg-paper-sunken hover:text-ink disabled:text-ink-muted",
  danger: "bg-danger text-white hover:bg-[#962016] active:translate-y-px disabled:opacity-60",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "md" | "lg";
  loading?: boolean;
  /** Texto exibido enquanto `loading` (ex.: "Enviando…"). */
  loadingLabel?: string;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  loadingLabel,
  disabled,
  className,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-control font-medium select-none transition-[background-color,border-color,color,transform] duration-150 disabled:cursor-not-allowed",
        size === "md" ? "min-h-12 px-5 text-base" : "min-h-14 px-7 text-lg",
        variants[variant],
        className,
      )}
      {...props}
    >
      {loading ? <Spinner /> : null}
      <span>{loading && loadingLabel ? loadingLabel : children}</span>
    </button>
  );
}
