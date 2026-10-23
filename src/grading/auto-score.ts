export interface ScorableQuestion {
  id: string;
  type: 'MCQ' | 'DISCURSIVE';
  points: number;
  answerKey: { correctOptionId: string | null } | null;
}

export interface ScorableAnswer {
  questionId: string;
  selectedOptionId: string | null;
  text: string | null;
}

/**
 * Nota automática por questão.
 * - MCQ: `points` se a alternativa bate com o gabarito, senão 0 (em branco = 0).
 * - Discursiva em branco: 0. Discursiva respondida: `null` (aguarda o professor).
 */
export function computeAutoScores(
  questions: ScorableQuestion[],
  answers: ScorableAnswer[],
): Map<string, number | null> {
  const byQuestion = new Map(answers.map((a) => [a.questionId, a]));
  const scores = new Map<string, number | null>();

  for (const q of questions) {
    const answer = byQuestion.get(q.id);
    if (q.type === 'MCQ') {
      const correct =
        !!answer?.selectedOptionId &&
        !!q.answerKey?.correctOptionId &&
        answer.selectedOptionId === q.answerKey.correctOptionId;
      scores.set(q.id, correct ? q.points : 0);
    } else {
      scores.set(q.id, answer?.text?.trim() ? null : 0);
    }
  }
  return scores;
}
