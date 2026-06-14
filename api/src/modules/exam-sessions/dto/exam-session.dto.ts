import { ExamSkill } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class StartSectionDto {
  @IsEnum(ExamSkill)
  skill: ExamSkill;
}

export class SaveAnswersDto {
  @IsObject()
  answers: Record<string, string | string[] | null>;
}

export class SubmitSectionDto {
  @IsEnum(ExamSkill)
  skill: ExamSkill;
}

export class SubmitWritingDto {
  @IsString()
  @IsOptional()
  task1Text?: string;

  @IsString()
  @IsOptional()
  task2Text?: string;
}

export class LogIntegrityDto {
  @IsString()
  @IsNotEmpty()
  event: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class CheckInDto {
  @IsOptional()
  acknowledgedRules?: boolean;
}
