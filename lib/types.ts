/**
 * Tipos espelhando os DTOs do backend servidos ao ALUNO
 * (StudentQuestionDto, StudentAnswerDto, ExamTakingController).
 * De propósito não existe tipo de gabarito aqui: se a API do aluno não
 * devolve, o front do aluno não conhece.
 */

export type QuestionType = "MCQ" | "DISCURSIVE";

export type SubmissionStatus = "IN_PROGRESS" | "SUBMITTED" | "GRADED";

export interface StudentOption {
  id: string;
  label: string;
  /** Markdown mínimo, como o enunciado (renderizado por <RichText>). */
  text: string;
}

export interface StudentQuestion {
  id: string;
  order: number;
  type: QuestionType;
  /** Markdown mínimo: `código inline` e blocos ```php (renderizado por <RichText>). */
  statement: string;
  codeSnippet: string | null;
  /** Linguagem do codeSnippet (php, sql, html…), para o syntax highlight. */
  codeLanguage: string | null;
  points: number;
  options: StudentOption[];
}

export interface StudentAnswer {
  questionId: string;
  selectedOptionId: string | null;
  text: string | null;
}

/** GET /exams?email= (StudentExamDto) */
export interface AvailableExam {
  id: string;
  title: string;
  description: string | null;
  opensAt: string;
  closesAt: string;
  durationMinutes: number;
}

/** POST /exams/:id/start */
export interface StartExamResponse {
  status: SubmissionStatus;
  startedAt: string;
  expiresAt: string;
  submittedAt: string | null;
}

/** GET /exams/:id/questions */
export interface ExamSession {
  exam: { id: string; title: string; description: string | null };
  submission: {
    status: SubmissionStatus;
    startedAt: string;
    expiresAt: string;
    submittedAt: string | null;
    readOnly: boolean;
  };
  questions: StudentQuestion[];
  answers: StudentAnswer[];
}

/** POST /exams/:id/answers */
export interface SaveAnswerPayload {
  questionId: string;
  selectedOptionId?: string | null;
  text?: string | null;
}

export interface SaveAnswerResponse {
  questionId: string;
  savedAt: string;
}

/** POST /exams/:id/submit */
export interface SubmitResponse {
  status: SubmissionStatus;
  submittedAt: string;
}
