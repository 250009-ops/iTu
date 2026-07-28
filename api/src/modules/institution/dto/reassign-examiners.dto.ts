import { IsOptional, IsString } from 'class-validator';

/** Reassign writing and/or speaking examiner on an existing enrolment. */
export class ReassignExaminersDto {
  @IsOptional()
  @IsString()
  writingTeacherId?: string;

  @IsOptional()
  @IsString()
  speakingTeacherId?: string;
}
