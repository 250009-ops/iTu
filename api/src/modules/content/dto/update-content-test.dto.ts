import {
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdateContentTestDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsObject()
  @IsOptional()
  content?: object;

  @IsObject()
  @IsOptional()
  answerKey?: object;

  @IsInt()
  @Min(1)
  @IsOptional()
  durationMin?: number;
}
