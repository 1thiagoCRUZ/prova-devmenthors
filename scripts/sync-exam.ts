/**
 * Atualiza as questões de uma prova JÁ EXISTENTE a partir do JSON (mesmo formato do import).
 *
 *   npx ts-node scripts/sync-exam.ts <examId> provas/arquivo.json
 *
 * Casa as questões pela `order`; atualiza enunciado, código, alternativas e gabarito.
 * Não mexe em título, datas, duração, status nem nos pontos. Só funciona enquanto a
 * prova não tiver submissões (o QuestionsService recusa, igual à API).
 */
import 'reflect-metadata';
import { readFileSync } from 'node:fs';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AppModule } from '../src/app.module';
import { UpdateQuestionDto } from '../src/questions/dto/question-input.dto';
import { QuestionsService } from '../src/questions/questions.service';

interface QuestionEntry {
  order: number;
  type: 'MCQ' | 'DISCURSIVE';
  [key: string]: unknown;
}

async function main() {
  const [examId, file] = process.argv.slice(2);
  if (!examId || !file) throw new Error('Uso: ts-node scripts/sync-exam.ts <examId> <arquivo.json>');
  const data = JSON.parse(readFileSync(file, 'utf8')) as { questions: QuestionEntry[] };

  // Valida tudo antes de gravar. `type` e `order` não entram no update (o tipo não muda).
  const updates: { order: number; type: string; dto: UpdateQuestionDto }[] = [];
  for (const { order, type, ...rest } of data.questions) {
    const dto = plainToInstance(UpdateQuestionDto, rest);
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
    if (errors.length > 0) {
      const detail = errors.map((e) => `${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`);
      throw new Error(`Questão de ordem ${order} inválida → ${detail.join(' | ')}`);
    }
    updates.push({ order, type, dto });
  }

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  try {
    const questions = app.get(QuestionsService);
    const existing = await questions.findForTeacher(examId);
    const byOrder = new Map(existing.map((q) => [q.order, q]));

    // Confere a correspondência inteira antes da primeira escrita.
    for (const u of updates) {
      const current = byOrder.get(u.order);
      if (!current) throw new Error(`A prova não tem questão de ordem ${u.order}`);
      if (current.type !== u.type) throw new Error(`Questão ${u.order}: tipo diferente (${current.type} x ${u.type})`);
    }
    if (existing.length !== updates.length) {
      throw new Error(`A prova tem ${existing.length} questões e o arquivo tem ${updates.length}`);
    }

    for (const u of updates) await questions.update(byOrder.get(u.order)!.id, u.dto);
    console.log(`${updates.length} questões atualizadas na prova ${examId}`);
  } finally {
    await app.close();
  }
}

main().catch((err) => {
  new Logger('sync-exam').error((err as Error).message);
  process.exit(1);
});
