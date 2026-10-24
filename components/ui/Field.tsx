import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type Ref,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/cn";

const control =
  "w-full rounded-control border-[1.5px] bg-paper-raised px-4 text-[1.0625rem] text-ink placeholder:text-ink-muted transition-[border-color,box-shadow] duration-150 hover:border-ink-soft focus:border-pen focus:shadow-[0_0_0_3px_var(--color-pen-soft)] focus:outline-none disabled:cursor-not-allowed disabled:bg-paper-sunken disabled:text-ink-muted";

interface FieldShellProps {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  hideLabel?: boolean;
  children: ReactNode;
}

function FieldShell({ id, label, hint, error, hideLabel, children }: FieldShellProps) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className={cn("text-[0.9375rem] font-medium text-ink", hideLabel && "sr-only")}>
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <div id={`${id}-hint`} className="text-sm text-ink-muted">
          {hint}
        </div>
      ) : null}
    </div>
  );
}

function describedBy(id: string, error?: string, hint?: ReactNode) {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  hideLabel?: boolean;
  ref?: Ref<HTMLInputElement>;
}

export function Input({ label, hint, error, hideLabel, className, id: idProp, ...props }: InputProps) {
  const generated = useId();
  const id = idProp ?? generated;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} hideLabel={hideLabel}>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={cn(control, "min-h-14", error ? "border-danger" : "border-line-strong", className)}
        {...props}
      />
    </FieldShell>
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  hideLabel?: boolean;
  ref?: Ref<HTMLSelectElement>;
}

export function Select({ label, hint, error, hideLabel, className, id: idProp, children, ...props }: SelectProps) {
  const generated = useId();
  const id = idProp ?? generated;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} hideLabel={hideLabel}>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={cn(control, "min-h-14", error ? "border-danger" : "border-line-strong", className)}
        {...props}
      >
        {children}
      </select>
    </FieldShell>
  );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  hideLabel?: boolean;
  ref?: Ref<HTMLTextAreaElement>;
}

export function Textarea({ label, hint, error, hideLabel, className, id: idProp, ...props }: TextareaProps) {
  const generated = useId();
  const id = idProp ?? generated;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} hideLabel={hideLabel}>
      <textarea
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={cn(
          control,
          "field-sizing-content min-h-40 resize-y py-3 leading-relaxed",
          error ? "border-danger" : "border-line-strong",
          className,
        )}
        {...props}
      />
    </FieldShell>
  );
}
