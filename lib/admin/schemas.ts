import { z } from "zod";

// Espelham os DTOs do backend (CreateExamDto, CreateQuestionDto…). Validar
// aqui é só UX/defesa extra: a decisão final continua sendo da API.

export const examInputSchema = z
  .object({
    title: z.string().trim().min(1, "Informe o título").max(200, "Máximo de 200 caracteres"),
    description: z.string().trim().max(5000, "Máximo de 5000 caracteres"),
    opensAt: z.iso.datetime({ message: "Data de abertura inválida" }),
    closesAt: z.iso.datetime({ message: "Data de encerramento inválida" }),
    durationMinutes: z
      .number({ message: "Informe a duração" })
      .int("Use minutos inteiros")
      .min(1, "Mínimo de 1 minuto")
      .max(1440, "Máximo de 24 horas"),
  })
  .refine((v) => Date.parse(v.opensAt) < Date.parse(v.closesAt), {
    message: "A abertura precisa ser antes do encerramento",
    path: ["closesAt"],
  });
export type ExamInput = z.infer<typeof examInputSchema>;

export const LABELS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"] as const;

/** Mesma lista de CODE_LANGUAGES do backend (CreateQuestionDto.codeLanguage). */
export const CODE_LANGUAGES = [
  "php",
  "sql",
  "html",
  "css",
  "javascript",
  "typescript",
  "json",
  "python",
  "java",
  "c",
  "cpp",
  "csharp",
  "bash",
  "plaintext",
] as const;
export type CodeLanguage = (typeof CODE_LANGUAGES)[number];

export const questionInputSchema = z
  .object({
    type: z.enum(["MCQ", "DISCURSIVE"]),
    order: z.number().int().min(1, "Ordem mínima é 1"),
    statement: z.string().trim().min(1, "Escreva o enunciado").max(10000),
    codeSnippet: z.string().max(20000),
    /** "" = sem linguagem (texto puro). */
    codeLanguage: z.union([z.literal(""), z.enum(CODE_LANGUAGES)]),
    points: z
      .number({ message: "Informe os pontos" })
      .min(0.01, "Mínimo 0,01")
      .max(1000, "Máximo 1000")
      .refine((n) => Math.round(n * 100) === n * 100, "No máximo 2 casas decimais"),
    options: z.array(z.object({ label: z.enum(LABELS), text: z.string().trim().min(1, "Preencha a alternativa").max(2000) })),
    correctOptionLabel: z.enum(LABELS).nullable(),
    expectedPoints: z.string().max(10000),
    rubric: z.string().max(10000),
    explanation: z.string().max(10000),
  })
  .superRefine((v, ctx) => {
    if (v.type !== "MCQ") return;
    if (v.options.length < 2 || v.options.length > 10) {
      ctx.addIssue({ code: "custom", message: "Use de 2 a 10 alternativas", path: ["options"] });
    }
    if (!v.correctOptionLabel || !v.options.some((o) => o.label === v.correctOptionLabel)) {
      ctx.addIssue({ code: "custom", message: "Marque a alternativa correta", path: ["correctOptionLabel"] });
    }
  });
export type QuestionInput = z.infer<typeof questionInputSchema>;

export const emailListSchema = z
  .string()
  .transform((raw) => [...new Set(raw.split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean))])
  .pipe(
    z
      .array(z.email({ message: "Há e-mails inválidos na lista" }).max(254))
      .min(1, "Informe ao menos um e-mail")
      .max(1000, "Máximo de 1000 e-mails por vez"),
  );

export const scoreSchema = z
  .number({ message: "Informe a nota" })
  .min(0, "A nota não pode ser negativa")
  .refine((n) => Math.round(n * 100) === n * 100, "No máximo 2 casas decimais");
