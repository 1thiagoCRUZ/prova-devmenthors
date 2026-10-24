import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsIn,
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

/**
 * Linguagens aceitas em `codeLanguage` (nomes usados pelos highlighters, ex.: highlight.js/Shiki).
 * `statement` e `options[].text` são Markdown: código inline entre crases e blocos
 * cercados com a linguagem (```php). Veja docs/FRONTEND.md.
 */
export const CODE_LANGUAGES = [
  'php',
  'sql',
  'html',
  'css',
  'javascript',
  'typescript',
  'json',
  'python',
  'java',
  'c',
  'cpp',
  'csharp',
  'bash',
  'plaintext',
] as const;
export type CodeLanguage = (typeof CODE_LANGUAGES)[number];

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

  /** `null` (na edição) remove a linguagem. */
  @IsOptional()
  @IsIn(CODE_LANGUAGES)
  codeLanguage?: CodeLanguage | null;

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

  /** `null` (na edição) remove a linguagem. */
  @IsOptional()
  @IsIn(CODE_LANGUAGES)
  codeLanguage?: CodeLanguage | null;

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
