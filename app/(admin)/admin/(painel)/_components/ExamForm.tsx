"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { createExamAction, updateExamAction } from "@/lib/admin/actions";
import { isoToLocalInput, localInputToIso } from "@/lib/admin/time";
import { zodResolver } from "@/lib/zod-resolver";
import { useAction } from "./use-action";

const formSchema = z
  .object({
    title: z.string().trim().min(1, "Informe o título").max(200, "Máximo de 200 caracteres"),
    description: z.string().max(5000, "Máximo de 5000 caracteres"),
    opensAt: z.string().refine((v) => localInputToIso(v) !== null, "Informe data e hora"),
    closesAt: z.string().refine((v) => localInputToIso(v) !== null, "Informe data e hora"),
    durationMinutes: z.string().regex(/^\d+$/, "Use minutos inteiros"),
  })
  .refine((v) => (localInputToIso(v.opensAt) ?? "") < (localInputToIso(v.closesAt) ?? ""), {
    message: "O encerramento precisa ser depois da abertura",
    path: ["closesAt"],
  });
type FormValues = z.infer<typeof formSchema>;

interface ExamFormProps {
  exam?: { id: string; title: string; description: string | null; opensAt: string; closesAt: string; durationMinutes: number };
  disabled?: boolean;
}

export function ExamForm({ exam, disabled = false }: ExamFormProps) {
  const { pending, result, run } = useAction();
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: exam
      ? {
          title: exam.title,
          description: exam.description ?? "",
          opensAt: isoToLocalInput(exam.opensAt),
          closesAt: isoToLocalInput(exam.closesAt),
          durationMinutes: String(exam.durationMinutes),
        }
      : { title: "", description: "", opensAt: "", closesAt: "", durationMinutes: "60" },
  });

  const onSubmit = handleSubmit((values) => {
    const input = {
      title: values.title,
      description: values.description,
      opensAt: localInputToIso(values.opensAt)!,
      closesAt: localInputToIso(values.closesAt)!,
      durationMinutes: Number(values.durationMinutes),
    };
    run(
      () => (exam ? updateExamAction(exam.id, input) : createExamAction(input)),
      () => reset(values),
    );
  });

  const locked = disabled || pending;

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <Input label="Título" error={errors.title?.message} disabled={locked} {...register("title")} />
      <Textarea
        label="Instruções para o aluno (opcional)"
        className="min-h-24"
        error={errors.description?.message}
        disabled={locked}
        {...register("description")}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Abre em"
          type="datetime-local"
          hint="Horário de Brasília"
          error={errors.opensAt?.message}
          disabled={locked}
          {...register("opensAt")}
        />
        <Input
          label="Fecha em"
          type="datetime-local"
          hint="Ninguém começa nem responde depois disso"
          error={errors.closesAt?.message}
          disabled={locked}
          {...register("closesAt")}
        />
      </div>
      <Input
        label="Duração de cada tentativa (minutos)"
        type="number"
        inputMode="numeric"
        min={1}
        max={1440}
        hint="Conta a partir de quando o aluno entra, limitada pelo horário de fechamento."
        error={errors.durationMinutes?.message}
        disabled={locked}
        {...register("durationMinutes")}
      />

      {result && !result.ok ? <Notice tone="danger">{result.error}</Notice> : null}
      {result?.ok && result.message && !isDirty ? <Notice tone="ok">{result.message}</Notice> : null}

      {disabled ? null : (
        <div>
          <Button type="submit" loading={pending} loadingLabel="Salvando…" disabled={exam ? !isDirty : false}>
            {exam ? "Salvar alterações" : "Criar prova"}
          </Button>
        </div>
      )}
    </form>
  );
}
