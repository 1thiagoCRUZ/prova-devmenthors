import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { RichText } from "./RichText";

interface RadioCardProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  letter: string;
  /** Markdown mínimo (código inline / blocos), renderizado por <RichText>. */
  text: string;
}

/**
 * Alternativa de múltipla escolha como bolha de cartão-resposta.
 * <label> real com <input type="radio">: setas do teclado, leitor de tela e toque funcionam nativamente.
 */
export function RadioCard({ letter, text, className, ...props }: RadioCardProps) {
  return (
    <label
      className={cn(
        "group flex min-h-16 cursor-pointer items-center gap-4 rounded-control border-[1.5px] border-line bg-paper-raised px-4 py-3.5 transition-[border-color,background-color] duration-150",
        "hover:border-line-strong has-checked:border-pen has-checked:bg-pen-soft",
        "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-pen",
        "has-disabled:cursor-not-allowed has-disabled:opacity-70 has-disabled:hover:border-line",
        className,
      )}
    >
      <input type="radio" className="peer sr-only" {...props} />
      <span
        aria-hidden="true"
        className="grid size-10 shrink-0 place-items-center rounded-full border-2 border-ink-soft font-mono text-base font-medium text-ink-soft transition-colors duration-150 group-hover:border-ink peer-checked:animate-pop peer-checked:border-pen peer-checked:bg-pen peer-checked:text-white"
      >
        {letter}
      </span>
      <span className="min-w-0 flex-1 text-[1.0625rem] leading-relaxed text-ink">
        <span className="sr-only">Alternativa {letter}: </span>
        <RichText text={text} codeSize="sm" />
      </span>
    </label>
  );
}
