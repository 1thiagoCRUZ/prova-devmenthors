import { QuestionsService } from './questions.service';

/**
 * Contrato da rota de aluno: se este teste quebrar, algum campo novo está
 * saindo para o aluno. Só altere a lista abaixo de forma consciente.
 */
const STUDENT_QUESTION_KEYS = ['codeSnippet', 'id', 'options', 'order', 'points', 'statement', 'type'];
const STUDENT_OPTION_KEYS = ['id', 'label', 'text'];

describe('QuestionsService.findForStudent', () => {
  const findMany = jest.fn();
  const prisma = { question: { findMany } };
  const service = new QuestionsService(prisma as never, { log: jest.fn() } as never);

  beforeEach(() => findMany.mockReset());

  it('não pede AnswerKey ao banco', async () => {
    findMany.mockResolvedValue([]);
    await service.findForStudent('exam-1');

    const args = findMany.mock.calls[0][0];
    expect(args.include).toBeUndefined();
    expect(args.select).toBeDefined();
    expect(args.select.answerKey).toBeUndefined();
    expect(Object.keys(args.select.options.select).sort()).toEqual(STUDENT_OPTION_KEYS);
  });

  it('descarta gabarito e campos extras mesmo que o banco os devolva', async () => {
    findMany.mockResolvedValue([
      {
        id: 'q1',
        examId: 'exam-1',
        order: 1,
        type: 'MCQ',
        statement: 'Quanto é 2+2?',
        codeSnippet: null,
        points: 1,
        createdAt: new Date(),
        answerKey: { correctOptionId: 'o2', rubric: 'segredo', explanation: 'porque sim' },
        options: [
          { id: 'o1', label: 'A', text: '3', isCorrect: false, questionId: 'q1' },
          { id: 'o2', label: 'B', text: '4', isCorrect: true, questionId: 'q1' },
        ],
      },
    ]);

    const result = await service.findForStudent('exam-1');
    const json = JSON.stringify(result);

    expect(Object.keys(result[0]).sort()).toEqual(STUDENT_QUESTION_KEYS);
    for (const option of result[0].options) {
      expect(Object.keys(option).sort()).toEqual(STUDENT_OPTION_KEYS);
    }
    expect(json).not.toMatch(/answerKey|isCorrect|correctOptionId|rubric|explanation|segredo/);
    expect(json).not.toContain('examId');
  });
});
