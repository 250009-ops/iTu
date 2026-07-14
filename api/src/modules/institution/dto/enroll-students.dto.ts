import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class EnrollStudentsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  studentIds: string[];

  @IsString()
  @IsNotEmpty()
  packageId: string;

  @IsDateString()
  mockDate: string;

  @IsOptional()
  @IsString()
  writingTeacherId?: string;

  @IsOptional()
  @IsString()
  speakingTeacherId?: string;
}
