import { Type } from 'class-transformer';
import { IsDate, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateExamDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @Type(() => Date)
  @IsDate()
  opensAt: Date;

  @Type(() => Date)
  @IsDate()
  closesAt: Date;

  @IsInt()
  @Min(1)
  @Max(24 * 60)
  durationMinutes: number;
}
