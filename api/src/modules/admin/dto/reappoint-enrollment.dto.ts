import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ReappointEnrollmentDto {
  @IsString()
  @IsNotEmpty()
  enrollmentId: string;

  @IsDateString()
  mockDate: string;

  @IsOptional()
  @IsString()
  mockTime?: string;

  @IsOptional()
  @IsString()
  mockDayCutoffTime?: string;

  @IsOptional()
  @IsString()
  writingTeacherId?: string;

  @IsOptional()
  @IsString()
  speakingTeacherId?: string;
}
