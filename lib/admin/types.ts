/** Formas devolvidas pelas rotas de PROFESSOR. Nunca importar no código do aluno. */

export type ExamStatus = "DRAFT" | "PUBLISHED" | "CLOSED";
export type QuestionType = "MCQ" | "DISCURSIVE";
export type SubmissionStatus = "IN_PROGRESS" | "SUBMITTED" | "GRADED";

export interface TeacherExam {
  id: string;
  title: string;
  description: string | null;
  status: ExamStatus;
  opensAt: string;
  closesAt: string;
  durationMinutes: number;
  createdAt: string;
  updatedAt: string;
  _count: { questions: number; submissions: number; assignments: number };
}

export interface TeacherOption {
  id: string;
  questionId: string;
  label: string;
  text: string;
}

export interface TeacherAnswerKey {
  id: string;
  questionId: string;
  correctOptionId: string | null;
  expectedPoints: string | null;
  rubric: string | null;
  explanation: string | null;
}

export interface TeacherQuestion {
  id: string;
  examId: string;
  order: number;
  type: QuestionType;
  statement: string;
  codeSnippet: string | null;
  codeLanguage: string | null;
  points: number;
  options: TeacherOption[];
  answerKey: TeacherAnswerKey | null;
}

export interface Assignment {
  id: string;
  examId: string;
  email: string;
  createdAt: string;
}

export interface SubmissionRow {
  id: string;
  studentName: string;
  studentEmail: string;
  status: SubmissionStatus;
  startedAt: string;
  expiresAt: string;
  submittedAt: string | null;
  totalScore: number | null;
  pendingGrading: number | null;
}

export interface SubmissionAnswer {
  id: string;
  questionId: string;
  selectedOptionId: string | null;
  text: string | null;
  score: number | null;
  updatedAt: string;
  selectedOption: { label: string; text: string } | null;
  question: {
    order: number;
    type: QuestionType;
    statement: string;
    points: number;
    answerKey: TeacherAnswerKey | null;
  };
}

export interface SubmissionDetail extends Omit<SubmissionRow, "pendingGrading"> {
  examId: string;
  answers: SubmissionAnswer[];
}

export interface ExamReport {
  examId: string;
  maxScore: number;
  submissions: { inProgress: number; submitted: number; graded: number };
  scores: { gradedCount: number; average: number | null; min: number | null; max: number | null };
  questions: Array<
    | {
        questionId: string;
        order: number;
        type: "MCQ";
        points: number;
        answeredCount: number;
        averageScore: number | null;
        correctRate: number | null;
        optionDistribution: { label: string; count: number }[];
      }
    | {
        questionId: string;
        order: number;
        type: "DISCURSIVE";
        points: number;
        answeredCount: number;
        averageScore: number | null;
        pendingGrading: number;
      }
  >;
}

/** Resultado padrão das Server Actions do painel. */
export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };
