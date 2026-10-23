import { Expose } from 'class-transformer';

/** Forma pública da prova: só o que o aluno pode ver (whitelist via @Expose). */
export class StudentExamDto {
  @Expose() id: string;
  @Expose() title: string;
  @Expose() description: string | null;
  @Expose() opensAt: Date;
  @Expose() closesAt: Date;
  @Expose() durationMinutes: number;
}
