import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { QuestionType } from '../../../generated/prisma/client';

export class OptionInputDto {
  @IsString()
  @Matches(/^[A-J]$/, { message: 'label deve ser uma letra de A a J' })
  label: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  text: string;
}

export class AnswerKeyInputDto {
  /** MCQ: letra da alternativa correta (os ids das alternativas só existem depois de criadas). */
  @IsOptional()
  @IsString()
  @Matches(/^[A-J]$/)
  correctOptionLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  expectedPoints?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  rubric?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  explanation?: string;
}

export class CreateQuestionDto {
  @IsInt()
  @Min(1)
  order: number;

  @IsEnum(QuestionType)
  type: QuestionType;

  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  statement: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  codeSnippet?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(1000)
  points?: number;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => OptionInputDto)
  options?: OptionInputDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => AnswerKeyInputDto)
  answerKey?: AnswerKeyInputDto;
}

/** O tipo da questão não muda depois de criada. Enviar `options` substitui todas as alternativas. */
export class UpdateQuestionDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  order?: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  statement?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  codeSnippet?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(1000)
  points?: number;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => OptionInputDto)
  options?: OptionInputDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => AnswerKeyInputDto)
  answerKey?: AnswerKeyInputDto;
}
