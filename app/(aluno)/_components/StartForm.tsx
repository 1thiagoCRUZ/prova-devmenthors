"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { isApiError } from "@/lib/api-client";
import { broadcastExamEvent } from "@/lib/exam-channel";
import { EXAM_CODE_LENGTH, examCode, isValidExamCode, normalizeExamCode } from "@/lib/exam-code";
import { listAvailableExams, startExam } from "@/lib/student-api";
import type { StartExamResponse } from "@/lib/types";
import { zodResolver } from "@/lib/zod-resolver";

// Espelha StartExamDto do backend (a validação que vale é a de lá).
const identity = {
  name: z.string().trim().min(2, "Informe seu nome (mínimo 2 letras)").max(120, "Use no máximo 120 caracteres"),
  email: z.string().trim().max(254, "E-mail muito longo").pipe(z.email("Informe um e-mail válido")),
};
const withCode = z.object({
  code: z
    .string()
    .transform(normalizeExamCode)
    .refine(isValidExamCode, `O código tem ${EXAM_CODE_LENGTH} caracteres (letras A–F e números)`),
  ...identity,
});
const withoutCode = z.object({ code: z.string().optional(), ...identity });

type FormValues = z.input<typeof withCode>;

interface StartFormProps {
  /** Prova já conhecida (veio do link). Sem ele, pede o código da sala. */
  examId?: string;
  onInProgress: (examId: string) => void;
  /** E-mail já enviou (ou o tempo dele acabou): o backend não emite token novo. */
  onClosed: (examId: string, result: StartExamResponse) => void;
  submitLabel?: string;
}

export function StartForm({ examId, onInProgress, onClosed, submitLabel = "Entrar" }: StartFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver((examId ? withoutCode : withCode) as unknown as z.ZodType<FormValues>),
    defaultValues: { code: "", name: "", email: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const student = { name: values.name.trim(), email: values.email.trim() };

    let id = examId;
    if (!id) {
      const code = normalizeExamCode(values.code);
      try {
        // Só provas abertas agora e liberadas para este e-mail; o código escolhe entre elas.
        const { data } = await listAvailableExams(student.email);
        id = data.find((exam) => examCode(exam.id) === code)?.id;
      } catch (err) {
        setServerError(startErrorMessage(err));
        return;
      }
      if (!id) {
        setServerError(
          "Não achamos uma prova aberta com este código para este e-mail. Confira o código, use o e-mail que o professor cadastrou e veja se a prova já começou.",
        );
        return;
      }
    }

    try {
      const { data } = await startExam(id, student);
      if (data.status === "IN_PROGRESS") {
        // Outras abas desta prova precisam saber que o cookie mudou de dono.
        broadcastExamEvent(id, "started");
        onInProgress(id);
      } else {
        onClosed(id, data);
      }
    } catch (err) {
      setServerError(startErrorMessage(err));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      {examId ? null : (
        <Input
          label="Código da sala"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={EXAM_CODE_LENGTH + 2}
          placeholder="Ex.: 7ADC0D"
          hint="O professor mostra o código no quadro ou na tela."
          className="font-mono text-2xl tracking-[0.3em] uppercase placeholder:font-sans placeholder:text-base placeholder:tracking-normal placeholder:normal-case"
          error={errors.code?.message}
          disabled={isSubmitting}
          {...register("code")}
        />
      )}
      <Input
        label="Nome completo"
        autoComplete="name"
        autoCapitalize="words"
        error={errors.name?.message}
        disabled={isSubmitting}
        {...register("name")}
      />
      <Input
        label="E-mail"
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        error={errors.email?.message}
        disabled={isSubmitting}
        {...register("email")}
      />

      {serverError ? <Notice tone="danger" title="Não foi possível entrar">{serverError}</Notice> : null}

      <Button type="submit" size="lg" loading={isSubmitting} loadingLabel="Entrando…" className="mt-1 w-full">
        {submitLabel}
      </Button>
    </form>
  );
}

function startErrorMessage(err: unknown): string {
  if (!isApiError(err)) return "Erro inesperado. Tente de novo.";
  switch (err.kind) {
    case "forbidden":
    case "not-found":
      return "Esta prova não está disponível para este e-mail agora. Ela pode estar fora do horário de aplicação.";
    case "bad-request":
      return "Confira os dados: o e-mail parece inválido.";
    case "rate-limited":
      return "Muitas tentativas em pouco tempo. Aguarde um minuto e tente de novo.";
    case "network":
      return "Sem conexão com o servidor. Verifique sua internet e tente de novo.";
    default:
      return "O servidor não respondeu como esperado. Tente de novo em instantes.";
  }
}
