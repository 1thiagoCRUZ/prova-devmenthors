/**
 * Importa uma prova (com questões e gabarito) a partir de um JSON.
 *
 *   npx ts-node scripts/import-exam.ts provas/arquivo.json
 *
 * A prova é criada como DRAFT com uma janela provisória (agora → +7 dias):
 * ajuste opensAt/closesAt/durationMinutes e publique via PATCH /exams/:id.
 * Passa pelos mesmos services da API, então valida tudo igual às rotas.
 */
import 'reflect-metadata';
import { readFileSync } from 'node:fs';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AppModule } from '../src/app.module';
import { ExamsService } from '../src/exams/exams.service';
import { CreateQuestionDto } from '../src/questions/dto/question-input.dto';
import { QuestionsService } from '../src/questions/questions.service';
import { PrismaService } from '../src/prisma/prisma.service';

interface ExamFile {
  exam: { title: string; description?: string; durationMinutes: number };
  questions: unknown[];
}

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error('Uso: ts-node scripts/import-exam.ts <arquivo.json>');
  const data = JSON.parse(readFileSync(file, 'utf8')) as ExamFile;

  // Valida todas as questões antes de gravar qualquer coisa.
  const questions: CreateQuestionDto[] = [];
  for (const [i, raw] of data.questions.entries()) {
    const dto = plainToInstance(CreateQuestionDto, raw);
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
    if (errors.length > 0) {
      const detail = errors.map((e) => `${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`);
      throw new Error(`Questão #${i + 1} inválida → ${detail.join(' | ')}`);
    }
    questions.push(dto);
  }

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  try {
    const exams = app.get(ExamsService);
    const questionsService = app.get(QuestionsService);

    const now = new Date();
    const exam = await exams.create({
      title: data.exam.title,
      description: data.exam.description,
      durationMinutes: data.exam.durationMinutes,
      opensAt: now,
      closesAt: new Date(now.getTime() + 7 * 24 * 60 * 60_000),
    });

    try {
      for (const dto of questions) await questionsService.create(exam.id, dto);
    } catch (err) {
      // Sem submissões ainda: remover a prova (cascade) evita deixar uma prova pela metade.
      await app.get(PrismaService).exam.delete({ where: { id: exam.id } });
      throw err;
    }

    const mcq = questions.filter((q) => q.type === 'MCQ').length;
    console.log(`Prova criada (DRAFT): ${exam.id}`);
    console.log(`"${exam.title}" — ${mcq} objetivas, ${questions.length - mcq} discursivas`);
  } finally {
    await app.close();
  }
}

main().catch((err) => {
  new Logger('import-exam').error((err as Error).message);
  process.exit(1);
});
