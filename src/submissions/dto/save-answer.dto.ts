import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

/**
 * Só estes campos são aceitos (ValidationPipe com whitelist + forbidNonWhitelisted):
 * qualquer `score`, `submissionId` etc. vindo do aluno é rejeitado com 400.
 */
export class SaveAnswerDto {
  @IsUUID()
  questionId: string;

  /** MCQ. `null` limpa a resposta. */
  @IsOptional()
  @IsUUID()
  selectedOptionId?: string | null;

  /** Discursiva. */
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  text?: string | null;
}
