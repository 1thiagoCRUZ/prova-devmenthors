import { IsEmail, IsOptional, MaxLength } from 'class-validator';

export class StudentEmailQueryDto {
  /** Obrigatório para o aluno; ignorado para o professor. */
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;
}
