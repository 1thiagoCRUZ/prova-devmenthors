"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Notice } from "@/components/ui/Notice";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Spinner } from "@/components/ui/Spinner";
import { isApiError } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { clearExamDrafts, draftKeyFor, readDrafts } from "@/lib/drafts";
import { seededShuffle } from "@/lib/shuffle";
import { broadcastExamEvent } from "@/lib/exam-channel";
import { submitExam, terminalReasonOf, type TerminalReason } from "@/lib/student-api";
import type { ExamSession, StudentQuestion } from "@/lib/types";
import { useAutosave, type SaveState } from "@/lib/use-autosave";
import { useExamGuard } from "@/lib/use-exam-guard";
import { AnswerCard } from "./AnswerCard";
import { QuestionDiscursive } from "./QuestionDiscursive";
import { QuestionMCQ } from "./QuestionMCQ";
import { Timer } from "./Timer";

interface ExamFormProps {
  examId: string;
  session: ExamSession;
  clockOffset: number;
  /** O backend recusou (403/409/token trocado): o pai troca a tela. */
  onTerminal: (reason: TerminalReason) => void;
  /** O relógio local chegou a zero: o pai confirma com o backend. */
  onTimeElapsed: () => void;
  verifyingTime: boolean;
}

type Answers = Record<string, string | null>;

export function ExamForm({ examId, session, clockOffset, onTerminal, onTimeElapsed, verifyingTime }: ExamFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { exam, submission } = session;

  // Cada aluno vê as questões numa ordem própria: a semente é a tentativa dele
  // (startedAt não muda ao retomar), então recarregar mantém a mesma ordem.
  // Objetivas primeiro e discursivas depois, cada grupo embaralhado. A numeração
  // exibida segue esta ordem; no backend a ordem de cadastro não muda.
  const questions = useMemo(() => {
    const seed = `${exam.id}:${submission.startedAt}`;
    return [
      ...seededShuffle(session.questions.filter((q) => q.type === "MCQ"), `${seed}:mcq`),
      ...seededShuffle(session.questions.filter((q) => q.type === "DISCURSIVE"), `${seed}:discursive`),
    ];
  }, [session.questions, exam.id, submission.startedAt]);

  const typeById = useMemo(() => new Map(questions.map((q) => [q.id, q.type])), [questions]);
  const draftKey = draftKeyFor(examId, submission.startedAt);

  // Respostas salvas no backend + rascunhos desta aba que ainda não tinham sido confirmados.
  const [initial] = useState(() => {
    const values: Answers = {};
    for (const a of session.answers) {
      values[a.questionId] = typeById.get(a.questionId) === "MCQ" ? a.selectedOptionId : (a.text ?? "");
    }
    const savedCount = questions.filter((q) => hasValue(values[q.id])).length;
    const drafts = Object.fromEntries(
      Object.entries(readDrafts(draftKey)).filter(([questionId]) => typeById.has(questionId)),
    );
    return { values: { ...values, ...drafts }, drafts, savedCount };
  });
  const [answers, setAnswers] = useState<Answers>(initial.values);

  const terminated = useRef(false);
  const handleTerminal = useCallback(
    (reason: TerminalReason) => {
      terminated.current = true;
      onTerminal(reason);
    },
    [onTerminal],
  );

  const autosave = useAutosave({
    examId,
    draftKey,
    typeOf: (questionId) => typeById.get(questionId),
    onTerminal: handleTerminal,
  });

  const restored = useRef(false);
  const { restore } = autosave;
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    if (Object.keys(initial.drafts).length > 0) restore(initial.drafts);
  }, [initial.drafts, restore]);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const locked = verifyingTime || submitting;

  const setAnswer = (questionId: string, value: string | null) => {
    if (locked) return;
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    autosave.schedule(questionId, value);
  };

  const isAnswered = (questionId: string) => hasValue(answers[questionId]);
  const answeredCount = questions.filter((q) => isAnswered(q.id)).length;
  const blank = questions.map((q, i) => ({ q, n: i + 1 })).filter(({ q }) => !isAnswered(q.id));
  const overall = overallSaveState(autosave.states);

  async function confirmSubmit() {
    setSubmitError(null);
    setSubmitting(true);
    const allSaved = await autosave.flushAll();
    if (terminated.current) return;
    if (!allSaved) {
      setSubmitting(false);
      setSubmitError(
        "Algumas respostas ainda não foram salvas. Verifique sua conexão e tente enviar de novo — nada foi perdido.",
      );
      return;
    }
    try {
      await submitExam(examId);
      autosave.stop();
      clearExamDrafts(examId);
      broadcastExamEvent(examId, "submitted");
      queryClient.removeQueries({ queryKey: ["exam-session", examId] });
      router.replace(`/prova/${examId}/obrigado`);
    } catch (err) {
      const reason = terminalReasonOf(err) ?? (isApiError(err, "unauthorized") ? "replaced" : null);
      if (reason) {
        handleTerminal(reason);
        return;
      }
      setSubmitting(false);
      setSubmitError(
        isApiError(err, "network")
          ? "Sem conexão com o servidor. Suas respostas estão salvas; tente enviar de novo."
          : "O servidor não confirmou o envio. Tente de novo em instantes.",
      );
    }
  }

  const answerCardDesktopId = useId();
  const answerCardMobileId = useId();
  const shielded = useExamGuard();

  return (
    <>
      {shielded ? <ExamShield /> : null}
      <div
        data-exam-protected
        aria-hidden={shielded || undefined}
        className={cn("flex min-h-dvh flex-col bg-paper-sunken select-none", shielded && "invisible")}
      >
        {/* Faixa de tinta: o "relógio da sala". */}
        <header className="sticky top-0 z-20 bg-ink text-on-ink shadow-[0_1px_0_rgb(0_0_0/0.2)]">
          <div className="mx-auto flex h-20 max-w-[100rem] items-center justify-between gap-4 px-4 sm:px-6">
            <div className="min-w-0">
              <p className="truncate text-lg font-bold sm:text-xl">{exam.title}</p>
              <HeaderSaveStatus state={overall} />
            </div>
            <Timer expiresAt={submission.expiresAt} clockOffset={clockOffset} onExpire={onTimeElapsed} />
          </div>
          <div className="mx-auto flex max-w-[100rem] items-center gap-3 px-4 pb-4 sm:px-6">
            <ProgressBar
              tone="on-ink"
              value={answeredCount}
              max={questions.length}
              label="Questões respondidas"
              className="flex-1"
            />
            <span className="shrink-0 text-sm font-medium text-on-ink-muted tabular-nums">
              {answeredCount}/{questions.length} respondidas
            </span>
          </div>
        </header>

        {verifyingTime ? (
          <div role="status" className="bg-danger-soft text-ink">
            <p className="mx-auto flex max-w-[100rem] items-center gap-2 px-4 py-3 text-base font-medium sm:px-6">
              <Spinner /> O tempo acabou. Conferindo com o servidor…
            </p>
          </div>
        ) : null}

        <div className="mx-auto grid w-full max-w-[100rem] flex-1 gap-8 px-4 pt-6 pb-32 sm:px-6 sm:pt-8 lg:grid-cols-[minmax(0,1fr)_18rem] lg:pb-16">
          <main className="flex min-w-0 flex-col gap-5">
            {initial.savedCount > 0 || Object.keys(initial.drafts).length > 0 ? (
              <Notice tone="info" title="Você retomou a prova">
                {initial.savedCount > 0
                  ? `${initial.savedCount} ${initial.savedCount === 1 ? "resposta já estava salva" : "respostas já estavam salvas"}.`
                  : null}{" "}
                {Object.keys(initial.drafts).length > 0
                  ? "Respostas que ainda não tinham sido salvas antes de recarregar foram recuperadas e estão sendo enviadas."
                  : null}
              </Notice>
            ) : null}

            <p className="text-sm text-ink-muted">
              Copiar, colar, imprimir e capturar a tela ficam bloqueados. Se você sair desta janela, a prova fica oculta
              até você voltar — o tempo continua correndo.
            </p>

            {exam.description ? (
              <p className="rounded-2xl border border-line bg-paper-raised p-5 text-[1.0625rem] leading-relaxed whitespace-pre-wrap text-ink-soft sm:px-8">{exam.description}</p>
            ) : null}

            <div className="flex flex-col gap-5">
              {questions.map((question, index) => (
                <QuestionItem
                  key={question.id}
                  question={question}
                  number={index + 1}
                  value={answers[question.id] ?? null}
                  saveState={autosave.states[question.id]}
                  disabled={locked}
                  onChange={(value) => setAnswer(question.id, value)}
                />
              ))}
            </div>

            <section aria-labelledby={answerCardMobileId} className="rounded-2xl border border-line bg-paper-raised p-5 sm:p-8 lg:hidden">
              <AnswerCard
                headingId={answerCardMobileId}
                questions={questions}
                isAnswered={isAnswered}
                saveStates={autosave.states}
              />
              <Button size="lg" className="mt-5 w-full" disabled={locked} onClick={() => setConfirmOpen(true)}>
                Revisar e enviar
              </Button>
            </section>
          </main>

          <aside className="hidden lg:block">
            <div className="sticky top-36 flex flex-col gap-5 rounded-2xl border border-line bg-paper-raised p-6">
              <AnswerCard
                headingId={answerCardDesktopId}
                questions={questions}
                isAnswered={isAnswered}
                saveStates={autosave.states}
              />
              <Button size="lg" className="w-full" disabled={locked} onClick={() => setConfirmOpen(true)}>
                Revisar e enviar
              </Button>
            </div>
          </aside>
        </div>

        {/* Barra fixa no celular: progresso + envio sempre à mão. */}
        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-paper-raised/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm lg:hidden">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
            <span className="text-base text-ink-soft tabular-nums">
              <strong className="font-semibold text-ink">{answeredCount}</strong> de {questions.length} respondidas
            </span>
            <Button size="lg" disabled={locked} onClick={() => setConfirmOpen(true)}>
              Enviar prova
            </Button>
          </div>
        </div>

        <Modal
          open={confirmOpen}
          busy={submitting}
          onClose={() => {
            setConfirmOpen(false);
            setSubmitError(null);
          }}
          title="Enviar a prova?"
          description={
            <>
              <p>
                Você respondeu <strong className="text-ink tabular-nums">{answeredCount}</strong> de{" "}
                <span className="tabular-nums">{questions.length}</span> questões.
              </p>
              <p className="mt-2">
                <strong className="font-medium text-ink">O envio é definitivo:</strong> depois dele não dá para alterar
                nenhuma resposta.
              </p>
            </>
          }
          footer={
            <>
              <Button
                variant="secondary"
                autoFocus
                disabled={submitting}
                onClick={() => {
                  setConfirmOpen(false);
                  setSubmitError(null);
                }}
              >
                Voltar à prova
              </Button>
              <Button loading={submitting} loadingLabel="Enviando…" onClick={confirmSubmit}>
                Enviar definitivamente
              </Button>
            </>
          }
        >
          {blank.length > 0 ? (
            <Notice tone="warn" title={blank.length === 1 ? "1 questão em branco" : `${blank.length} questões em branco`}>
              Questões {blank.map(({ n }) => n).join(", ")}.
            </Notice>
          ) : null}
          {submitError ? <Notice tone="danger">{submitError}</Notice> : null}
        </Modal>
      </div>
    </>
  );
}

function ExamShield() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink px-6 text-center text-on-ink">
      <div className="max-w-md">
        <p className="text-2xl font-bold">Prova oculta</p>
        <p className="mt-3 text-lg text-on-ink-muted">
          Volte para esta janela para continuar. O tempo continua correndo e suas respostas estão salvas.
        </p>
      </div>
    </div>
  );
}

function QuestionItem({
  question,
  number,
  value,
  saveState,
  disabled,
  onChange,
}: {
  question: StudentQuestion;
  number: number;
  value: string | null;
  saveState?: SaveState;
  disabled: boolean;
  onChange: (value: string | null) => void;
}) {
  if (question.type === "MCQ") {
    return (
      <QuestionMCQ
        question={question}
        number={number}
        value={value}
        saveState={saveState}
        disabled={disabled}
        onChange={onChange}
      />
    );
  }
  return (
    <QuestionDiscursive
      question={question}
      number={number}
      value={value ?? ""}
      saveState={saveState}
      disabled={disabled}
      onChange={onChange}
    />
  );
}

function hasValue(value: string | null | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}

type Overall = "idle" | "saving" | "saved" | "error";

function overallSaveState(states: Record<string, SaveState>): Overall {
  const values = Object.values(states);
  if (values.includes("error")) return "error";
  if (values.includes("saving") || values.includes("pending")) return "saving";
  if (values.includes("saved")) return "saved";
  return "idle";
}

function HeaderSaveStatus({ state }: { state: Overall }) {
  return (
    <p className="mt-1 flex h-5 items-center gap-1.5 truncate text-sm text-on-ink-muted">
      {state === "saving" ? (
        <>
          <Spinner /> Salvando…
        </>
      ) : state === "saved" ? (
        "Tudo salvo"
      ) : state === "error" ? (
        <span className="truncate text-warn-on-ink">Sem conexão · tentando salvar</span>
      ) : (
        "Salvamento automático"
      )}
      {/* Só o erro é anunciado: "salvando…" a cada tecla seria ruído. */}
      <span aria-live="assertive" className="sr-only">
        {state === "error" ? "Sem conexão. Suas respostas serão enviadas quando a conexão voltar." : ""}
      </span>
    </p>
  );
}
