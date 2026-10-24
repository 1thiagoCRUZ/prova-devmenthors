import { Expose, Type } from 'class-transformer';

/**
 * Formas servidas ao aluno. Só o que tem @Expose sai na resposta
 * (plainToInstance com excludeExtraneousValues), então um campo novo
 * no banco nunca vaza por padrão.
 */
export class StudentOptionDto {
  @Expose() id: string;
  @Expose() label: string;
  @Expose() text: string;
}

export class StudentQuestionDto {
  @Expose() id: string;
  @Expose() order: number;
  @Expose() type: 'MCQ' | 'DISCURSIVE';
  @Expose() statement: string;
  @Expose() codeSnippet: string | null;
  @Expose() codeLanguage: string | null;
  @Expose() points: number;

  @Expose()
  @Type(() => StudentOptionDto)
  options: StudentOptionDto[];
}
