import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { hashToken } from '../src/common/utils/token';
import { PrismaService } from '../src/prisma/prisma.service';

const SECRETS = ['EXPLICACAO_SECRETA', 'RUBRICA_SECRETA', 'PONTOS_SECRETOS'];

describe('API de provas (e2e)', () => {
  let app: INestApplication;
  let http: App;
  let prisma: PrismaService;

  const admin = (req: request.Test) => req.set('x-admin-key', process.env.ADMIN_KEY as string);
  const asStudent = (req: request.Test, token: string) => req.set('Cookie', `exam_token=${token}`);

  function tokenFrom(res: request.Response): string | undefined {
    const raw = res.headers['set-cookie'] as unknown as string[] | undefined;
    const cookie = raw?.find((c) => c.startsWith('exam_token='));
    return cookie?.split(';')[0].slice('exam_token='.length);
  }

  async function createExam(overrides: Record<string, unknown> = {}) {
    const now = Date.now();
    const exam = await admin(request(http).post('/exams'))
      .send({
        title: 'Prova de teste',
        opensAt: new Date(now - 60_000).toISOString(),
        closesAt: new Date(now + 3_600_000).toISOString(),
        durationMinutes: 30,
        ...overrides,
      })
      .expect(201);
    const examId: string = exam.body.id;

    const mcq = await admin(request(http).post(`/exams/${examId}/questions`))
      .send({
        order: 1,
        type: 'MCQ',
        statement: 'Quanto é 2 + 2?',
        points: 2,
        options: [
          { label: 'A', text: '3' },
          { label: 'B', text: '4' },
        ],
        answerKey: { correctOptionLabel: 'B', explanation: 'EXPLICACAO_SECRETA' },
      })
      .expect(201);

    const disc = await admin(request(http).post(`/exams/${examId}/questions`))
      .send({
        order: 2,
        type: 'DISCURSIVE',
        statement: 'Explique closures.',
        points: 3,
        answerKey: { rubric: 'RUBRICA_SECRETA', expectedPoints: 'PONTOS_SECRETOS' },
      })
      .expect(201);

    return {
      examId,
      mcqId: mcq.body.id as string,
      correctOptionId: mcq.body.answerKey.correctOptionId as string,
      wrongOptionId: mcq.body.options.find((o: { label: string }) => o.label === 'A').id as string,
      discId: disc.body.id as string,
    };
  }

  async function createPublishedExam(overrides: Record<string, unknown> = {}) {
    const exam = await createExam(overrides);
    await admin(request(http).patch(`/exams/${exam.examId}`)).send({ status: 'PUBLISHED' }).expect(200);
    return exam;
  }

  function start(examId: string, email: string, name = 'Aluno Teste') {
    return request(http).post(`/exams/${examId}/start`).send({ name, email });
  }

  async function startAndGetToken(examId: string, email: string) {
    const res = await start(examId, email).expect(200);
    const token = tokenFrom(res);
    expect(token).toBeDefined();
    return token as string;
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    http = app.getHttpServer();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('autenticação do professor', () => {
    it('rota de professor sem chave → 401', async () => {
      await request(http).post('/exams').send({}).expect(401);
    });

    it('chave errada → 401', async () => {
      await request(http).get('/exams').set('x-admin-key', 'errada').expect(401);
    });

    it('POST /admin/login troca usuário e senha por um JWT', async () => {
      const password = process.env.TEST_ADMIN_PASSWORD as string;
      await request(http)
        .post('/admin/login')
        .send({ username: 'professor', password: 'errada' })
        .expect(401);
      await request(http).post('/admin/login').send({ username: 'outro', password }).expect(401);
      // A chave de automação não serve como senha do painel.
      await request(http).post('/admin/login').send({ key: process.env.ADMIN_KEY }).expect(400);
      const res = await request(http)
        .post('/admin/login')
        .send({ username: 'professor', password })
        .expect(200);
      expect(res.body.accessToken).toEqual(expect.any(String));

      await request(http)
        .get('/exams')
        .set('Authorization', `Bearer ${res.body.accessToken}`)
        .expect(200);
      await request(http).get('/exams').set('Authorization', 'Bearer invalido').expect(401);
    });

    it('aluno não acessa rotas de correção', async () => {
      const { examId } = await createPublishedExam();
      const token = await startAndGetToken(examId, 'curioso@escola.com');
      await asStudent(request(http).get(`/exams/${examId}/submissions`), token).expect(401);
      await asStudent(request(http).get(`/admin/exams/${examId}/questions`), token).expect(401);
    });
  });

  describe('publicação', () => {
    it('não publica prova sem questões', async () => {
      const now = Date.now();
      const exam = await admin(request(http).post('/exams'))
        .send({
          title: 'Vazia',
          opensAt: new Date(now).toISOString(),
          closesAt: new Date(now + 60_000).toISOString(),
          durationMinutes: 10,
        })
        .expect(201);
      await admin(request(http).patch(`/exams/${exam.body.id}`))
        .send({ status: 'PUBLISHED' })
        .expect(400);
    });

    it('MCQ sem gabarito é rejeitada', async () => {
      const { examId } = await createExam();
      await admin(request(http).post(`/exams/${examId}/questions`))
        .send({
          order: 3,
          type: 'MCQ',
          statement: 'Sem gabarito',
          options: [
            { label: 'A', text: 'x' },
            { label: 'B', text: 'y' },
          ],
        })
        .expect(400);
    });
  });

  describe('fluxo completo', () => {
    it('aluno responde, envia, e o professor corrige', async () => {
      const exam = await createPublishedExam();
      const email = 'fluxo@escola.com';
      const token = await startAndGetToken(exam.examId, email);

      // 1. Questões sem gabarito
      const q = await asStudent(request(http).get(`/exams/${exam.examId}/questions`), token).expect(
        200,
      );
      const json = JSON.stringify(q.body);
      for (const s of SECRETS) expect(json).not.toContain(s);
      expect(json).not.toMatch(/answerKey|correctOptionId|isCorrect|rubric|explanation/);
      expect(q.body.questions).toHaveLength(2);
      expect(q.body.submission.readOnly).toBe(false);

      // 2. Autosave idempotente
      for (let i = 0; i < 2; i++) {
        await asStudent(request(http).post(`/exams/${exam.examId}/answers`), token)
          .send({ questionId: exam.mcqId, selectedOptionId: exam.correctOptionId })
          .expect(200);
      }
      await asStudent(request(http).post(`/exams/${exam.examId}/answers`), token)
        .send({ questionId: exam.discId, text: 'Uma função que captura o escopo.' })
        .expect(200);
      const sub = await prisma.submission.findUniqueOrThrow({
        where: { examId_studentEmail: { examId: exam.examId, studentEmail: email } },
        include: { answers: true },
      });
      expect(sub.answers).toHaveLength(2);

      // 3. Campo extra (score) vindo do aluno é rejeitado
      await asStudent(request(http).post(`/exams/${exam.examId}/answers`), token)
        .send({ questionId: exam.mcqId, selectedOptionId: exam.correctOptionId, score: 999 })
        .expect(400);

      // 4. Alternativa de outra questão / tipo errado
      await asStudent(request(http).post(`/exams/${exam.examId}/answers`), token)
        .send({ questionId: exam.discId, selectedOptionId: exam.correctOptionId })
        .expect(400);

      // 5. Envio
      const submitted = await asStudent(
        request(http).post(`/exams/${exam.examId}/submit`),
        token,
      ).expect(200);
      expect(submitted.body.status).toBe('SUBMITTED');

      // 6. Depois de enviada: 409
      await asStudent(request(http).post(`/exams/${exam.examId}/answers`), token)
        .send({ questionId: exam.mcqId, selectedOptionId: exam.wrongOptionId })
        .expect(409);
      await asStudent(request(http).post(`/exams/${exam.examId}/submit`), token).expect(409);

      // 7. Reabrir: modo leitura, sem token novo
      const again = await start(exam.examId, email).expect(200);
      expect(again.body.status).toBe('SUBMITTED');
      expect(tokenFrom(again)).toBeUndefined();
      const readOnly = await asStudent(
        request(http).get(`/exams/${exam.examId}/questions`),
        token,
      ).expect(200);
      expect(readOnly.body.submission.readOnly).toBe(true);
      expect(readOnly.body.answers).toHaveLength(2);
      expect(JSON.stringify(readOnly.body)).not.toContain('score');

      // 8. Professor: objetiva já corrigida, discursiva pendente
      const list = await admin(request(http).get(`/exams/${exam.examId}/submissions`)).expect(200);
      expect(list.body).toHaveLength(1);
      expect(list.body[0].pendingGrading).toBe(1);

      const detail = await admin(request(http).get(`/submissions/${sub.id}`)).expect(200);
      const mcqAnswer = detail.body.answers.find((a: { questionId: string }) => a.questionId === exam.mcqId);
      const discAnswer = detail.body.answers.find((a: { questionId: string }) => a.questionId === exam.discId);
      expect(mcqAnswer.score).toBe(2);
      expect(discAnswer.score).toBeNull();
      expect(discAnswer.question.answerKey.rubric).toBe('RUBRICA_SECRETA');

      // 9. Nota da discursiva
      await admin(request(http).patch(`/submissions/${sub.id}/answers/${mcqAnswer.id}`))
        .send({ score: 0 })
        .expect(400);
      await admin(request(http).patch(`/submissions/${sub.id}/answers/${discAnswer.id}`))
        .send({ score: 10 })
        .expect(400);
      const graded = await admin(
        request(http).patch(`/submissions/${sub.id}/answers/${discAnswer.id}`),
      )
        .send({ score: 2.5 })
        .expect(200);
      expect(graded.body).toMatchObject({ status: 'GRADED', totalScore: 4.5 });

      // 10. Relatório agregado, sem dados de aluno
      const report = await admin(request(http).get(`/exams/${exam.examId}/report`)).expect(200);
      expect(report.body.maxScore).toBe(5);
      expect(report.body.scores.average).toBe(4.5);
      expect(report.body.questions[0].correctRate).toBe(1);
      expect(JSON.stringify(report.body)).not.toContain(email);

      // 11. Questões não mudam depois que alguém começou
      await admin(request(http).patch(`/questions/${exam.mcqId}`))
        .send({ statement: 'mudou' })
        .expect(409);
    });
  });

  describe('isolamento entre alunos', () => {
    it('cada token só enxerga a própria submissão', async () => {
      const exam = await createPublishedExam();
      const tokenA = await startAndGetToken(exam.examId, 'a@escola.com');
      const tokenB = await startAndGetToken(exam.examId, 'b@escola.com');

      await asStudent(request(http).post(`/exams/${exam.examId}/answers`), tokenA)
        .send({ questionId: exam.discId, text: 'RESPOSTA_DO_A' })
        .expect(200);

      const asB = await asStudent(request(http).get(`/exams/${exam.examId}/questions`), tokenB).expect(
        200,
      );
      expect(asB.body.answers).toEqual([]);
      expect(JSON.stringify(asB.body)).not.toContain('RESPOSTA_DO_A');
    });

    it('token de uma prova não abre outra', async () => {
      const exam1 = await createPublishedExam();
      const exam2 = await createPublishedExam();
      const token = await startAndGetToken(exam1.examId, 'cruzado@escola.com');

      await asStudent(request(http).get(`/exams/${exam2.examId}/questions`), token).expect(403);
      await asStudent(request(http).post(`/exams/${exam2.examId}/answers`), token)
        .send({ questionId: exam2.discId, text: 'x' })
        .expect(403);
      await asStudent(request(http).post(`/exams/${exam2.examId}/submit`), token).expect(403);
    });

    it('sem token → 401; token inventado → 403', async () => {
      const exam = await createPublishedExam();
      await request(http).get(`/exams/${exam.examId}/questions`).expect(401);
      await asStudent(request(http).get(`/exams/${exam.examId}/questions`), 'inventado').expect(403);
    });

    it('retomar a prova emite token novo e invalida o anterior', async () => {
      const exam = await createPublishedExam();
      const email = 'retoma@escola.com';
      const oldToken = await startAndGetToken(exam.examId, email);
      await asStudent(request(http).post(`/exams/${exam.examId}/answers`), oldToken)
        .send({ questionId: exam.mcqId, selectedOptionId: exam.wrongOptionId })
        .expect(200);

      const newToken = await startAndGetToken(exam.examId, email);
      expect(newToken).not.toBe(oldToken);

      await asStudent(request(http).get(`/exams/${exam.examId}/questions`), oldToken).expect(403);
      const res = await asStudent(
        request(http).get(`/exams/${exam.examId}/questions`),
        newToken,
      ).expect(200);
      expect(res.body.answers).toEqual([
        { questionId: exam.mcqId, selectedOptionId: exam.wrongOptionId, text: null },
      ]);
    });

    it('o token é guardado só como hash', async () => {
      const exam = await createPublishedExam();
      const token = await startAndGetToken(exam.examId, 'hash@escola.com');
      const sub = await prisma.submission.findFirstOrThrow({
        where: { examId: exam.examId, studentEmail: 'hash@escola.com' },
      });
      expect(sub.accessTokenHash).toBe(hashToken(token));
      expect(sub.accessTokenHash).not.toContain(token);
    });
  });

  describe('uma submissão por e-mail', () => {
    it('requests simultâneos criam uma única submissão', async () => {
      const exam = await createPublishedExam();
      const results = await Promise.all(
        Array.from({ length: 10 }, () => start(exam.examId, 'corrida@escola.com')),
      );
      for (const r of results) expect(r.status).toBe(200);
      const count = await prisma.submission.count({
        where: { examId: exam.examId, studentEmail: 'corrida@escola.com' },
      });
      expect(count).toBe(1);
    });

    it('o banco rejeita uma segunda submissão (constraint UNIQUE)', async () => {
      const exam = await createPublishedExam();
      await startAndGetToken(exam.examId, 'unico@escola.com');
      await expect(
        prisma.submission.create({
          data: {
            examId: exam.examId,
            studentName: 'Duplicado',
            studentEmail: 'unico@escola.com',
            accessTokenHash: hashToken('outro'),
            expiresAt: new Date(Date.now() + 60_000),
          },
        }),
      ).rejects.toMatchObject({ code: 'P2002' });
    });

    it('e-mail é normalizado (maiúsculas/espaços)', async () => {
      const exam = await createPublishedExam();
      await start(exam.examId, 'Maria@Escola.com').expect(200);
      await start(exam.examId, 'maria@escola.com').expect(200);
      const count = await prisma.submission.count({ where: { examId: exam.examId } });
      expect(count).toBe(1);
    });
  });

  describe('janela de tempo', () => {
    it('prova em rascunho ou ainda não aberta → 403', async () => {
      const draft = await createExam();
      await start(draft.examId, 'cedo@escola.com').expect(403);

      const now = Date.now();
      const future = await createPublishedExam({
        opensAt: new Date(now + 3_600_000).toISOString(),
        closesAt: new Date(now + 7_200_000).toISOString(),
      });
      await start(future.examId, 'cedo@escola.com').expect(403);
    });

    it('tentativa vencida: 403 e a submissão é fechada', async () => {
      const exam = await createPublishedExam();
      const email = 'atrasado@escola.com';
      const token = await startAndGetToken(exam.examId, email);
      await asStudent(request(http).post(`/exams/${exam.examId}/answers`), token)
        .send({ questionId: exam.mcqId, selectedOptionId: exam.correctOptionId })
        .expect(200);

      await prisma.submission.updateMany({
        where: { examId: exam.examId, studentEmail: email },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });

      await asStudent(request(http).post(`/exams/${exam.examId}/answers`), token)
        .send({ questionId: exam.mcqId, selectedOptionId: exam.wrongOptionId })
        .expect(403);
      await asStudent(request(http).get(`/exams/${exam.examId}/questions`), token).expect(403);

      const sub = await prisma.submission.findFirstOrThrow({
        where: { examId: exam.examId, studentEmail: email },
        include: { answers: true },
      });
      expect(sub.status).not.toBe('IN_PROGRESS');
      const mcq = sub.answers.find((a) => a.questionId === exam.mcqId);
      // A resposta que valeu é a salva dentro do prazo.
      expect(mcq?.selectedOptionId).toBe(exam.correctOptionId);
      expect(mcq?.score).toBe(2);

      const again = await start(exam.examId, email).expect(200);
      expect(tokenFrom(again)).toBeUndefined();
    });

    it('expiresAt é calculado no servidor', async () => {
      const exam = await createPublishedExam({ durationMinutes: 15 });
      const res = await start(exam.examId, 'relogio@escola.com').expect(200);
      const started = new Date(res.body.startedAt).getTime();
      const expires = new Date(res.body.expiresAt).getTime();
      expect(expires - started).toBe(15 * 60_000);
    });
  });

  describe('atribuições', () => {
    it('com Assignment, só os e-mails listados entram e enxergam a prova', async () => {
      const exam = await createPublishedExam();
      await admin(request(http).post(`/exams/${exam.examId}/assignments`))
        .send({ emails: ['Convidado@Escola.com'] })
        .expect(201);

      await start(exam.examId, 'intruso@escola.com').expect(403);
      await start(exam.examId, 'convidado@escola.com').expect(200);

      const forGuest = await request(http).get('/exams?email=convidado@escola.com').expect(200);
      expect(forGuest.body.map((e: { id: string }) => e.id)).toContain(exam.examId);
      const forIntruder = await request(http).get('/exams?email=intruso@escola.com').expect(200);
      expect(forIntruder.body.map((e: { id: string }) => e.id)).not.toContain(exam.examId);

      await request(http).get(`/exams/${exam.examId}?email=intruso@escola.com`).expect(404);
      const detail = await request(http)
        .get(`/exams/${exam.examId}?email=convidado@escola.com`)
        .expect(200);
      expect(Object.keys(detail.body).sort()).toEqual(
        ['closesAt', 'description', 'durationMinutes', 'id', 'opensAt', 'title'].sort(),
      );
    });

    it('aluno precisa informar e-mail para listar', async () => {
      await request(http).get('/exams').expect(400);
    });
  });

  describe('auditoria', () => {
    it('registra acessos negados sem gravar o token', async () => {
      const exam = await createPublishedExam();
      const token = await startAndGetToken(exam.examId, 'auditado@escola.com');
      const other = await createPublishedExam();
      await asStudent(request(http).get(`/exams/${other.examId}/questions`), token).expect(403);

      // o filtro grava de forma assíncrona
      await new Promise((r) => setTimeout(r, 200));
      const logs = await prisma.auditLog.findMany();
      expect(logs.some((l) => l.action === 'access.denied')).toBe(true);
      expect(logs.some((l) => l.action === 'submission.started')).toBe(true);
      expect(JSON.stringify(logs)).not.toContain(token);
      expect(JSON.stringify(logs)).not.toContain(process.env.ADMIN_KEY as string);
    });
  });
});
