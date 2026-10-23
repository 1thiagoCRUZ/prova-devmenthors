import { IsNumber, Min } from 'class-validator';

export class GradeAnswerDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  score: number;
}
