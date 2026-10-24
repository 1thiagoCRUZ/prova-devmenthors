"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface ModalProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer: ReactNode;
  /** Esc / clique fora. Ignorado enquanto `busy`. */
  onClose: () => void;
  busy?: boolean;
  className?: string;
}

/**
 * <dialog> nativo com showModal(): foco preso no modal, Esc, inert no resto
 * da página e retorno do foco ao fechar, sem lib.
 */
export function Modal({ open, title, description, children, footer, onClose, busy = false, className }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      aria-busy={busy || undefined}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
      className={cn(
        "m-auto w-[calc(100%-2rem)] max-w-md rounded-card border border-line bg-paper-raised p-0 text-ink shadow-sheet",
        className,
      )}
    >
      <div className="flex flex-col gap-4 p-5 sm:p-6">
        <h2 id={titleId} className="font-display text-2xl leading-tight font-semibold text-balance">
          {title}
        </h2>
        {description ? (
          <div id={descId} className="text-[0.9375rem] leading-relaxed text-ink-soft">
            {description}
          </div>
        ) : null}
        {children}
        <div className="mt-1 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{footer}</div>
      </div>
    </dialog>
  );
}
