import { ArrayMaxSize, ArrayMinSize, IsArray, IsEmail, MaxLength } from 'class-validator';

export class CreateAssignmentsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1000)
  @IsEmail({}, { each: true })
  @MaxLength(254, { each: true })
  emails: string[];
}
