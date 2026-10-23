import { computeAutoScores } from './auto-score';

describe('computeAutoScores', () => {
  const questions = [
    { id: 'mcq', type: 'MCQ' as const, points: 2, answerKey: { correctOptionId: 'b' } },
    { id: 'disc', type: 'DISCURSIVE' as const, points: 3, answerKey: null },
  ];

  it('MCQ certa vale os pontos da questão; discursiva respondida fica pendente', () => {
    const scores = computeAutoScores(questions, [
      { questionId: 'mcq', selectedOptionId: 'b', text: null },
      { questionId: 'disc', selectedOptionId: null, text: 'resposta' },
    ]);
    expect(scores.get('mcq')).toBe(2);
    expect(scores.get('disc')).toBeNull();
  });

  it('MCQ errada vale 0', () => {
    const scores = computeAutoScores(questions, [
      { questionId: 'mcq', selectedOptionId: 'a', text: null },
    ]);
    expect(scores.get('mcq')).toBe(0);
  });

  it('questões em branco valem 0', () => {
    const scores = computeAutoScores(questions, [
      { questionId: 'disc', selectedOptionId: null, text: '   ' },
    ]);
    expect(scores.get('mcq')).toBe(0);
    expect(scores.get('disc')).toBe(0);
  });

  it('MCQ sem gabarito nunca é considerada certa', () => {
    const scores = computeAutoScores(
      [{ id: 'mcq', type: 'MCQ', points: 1, answerKey: { correctOptionId: null } }],
      [{ questionId: 'mcq', selectedOptionId: null, text: null }],
    );
    expect(scores.get('mcq')).toBe(0);
  });
});
