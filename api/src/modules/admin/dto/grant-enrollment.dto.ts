import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GrantEnrollmentDto {
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @IsString()
  @IsNotEmpty()
  packageId: string;

  @IsDateString()
  mockDate: string;

  @IsString()
  @IsNotEmpty()
  mockTime: string;

  @IsOptional()
  @IsString()
  writingTeacherId?: string;

  @IsOptional()
  @IsString()
  speakingTeacherId?: string;

  @IsOptional()
  @IsString()
  speakingSlotId?: string;
}
