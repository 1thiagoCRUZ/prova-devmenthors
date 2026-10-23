import { Expose } from 'class-transformer';

/** Resposta do próprio aluno, sem nota (a nota não é liberada nesta versão). */
export class StudentAnswerDto {
  @Expose() questionId: string;
  @Expose() selectedOptionId: string | null;
  @Expose() text: string | null;
}
