import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

/** Dados de exemplo. Só roda fora de produção. */
async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Seed não roda em produção');
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL as string }),
  });

  const now = Date.now();
  const exam = await prisma.exam.create({
    data: {
      title: 'Prova de exemplo — JavaScript',
      description: 'Gerada pelo seed de desenvolvimento.',
      status: 'PUBLISHED',
      opensAt: new Date(now - 60 * 60_000),
      closesAt: new Date(now + 7 * 24 * 60 * 60_000),
      durationMinutes: 60,
    },
  });

  const mcq = await prisma.question.create({
    data: {
      examId: exam.id,
      order: 1,
      type: 'MCQ',
      statement: 'Qual é a saída do código abaixo?',
      codeSnippet: 'console.log(typeof null);',
      points: 2,
      options: {
        create: [
          { label: 'A', text: '"null"' },
          { label: 'B', text: '"object"' },
          { label: 'C', text: '"undefined"' },
          { label: 'D', text: 'Erro' },
        ],
      },
    },
    include: { options: true },
  });
  await prisma.answerKey.create({
    data: {
      questionId: mcq.id,
      correctOptionId: mcq.options.find((o) => o.label === 'B')!.id,
      explanation: 'typeof null é "object" por um legado da primeira implementação.',
    },
  });

  const disc = await prisma.question.create({
    data: {
      examId: exam.id,
      order: 2,
      type: 'DISCURSIVE',
      statement: 'Explique o que é uma closure e dê um exemplo de uso.',
      points: 3,
    },
  });
  await prisma.answerKey.create({
    data: {
      questionId: disc.id,
      expectedPoints: 'Função + escopo léxico capturado; exemplo (contador, factory, etc.).',
      rubric: '1 ponto definição, 1 ponto escopo léxico, 1 ponto exemplo correto.',
    },
  });

  console.log(`Prova de exemplo criada: ${exam.id}`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
