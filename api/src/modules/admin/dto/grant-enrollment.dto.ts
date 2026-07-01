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

  /** Omit for flexible-start grants; student begins anytime before cutoff. */
  @IsOptional()
  @IsString()
  mockTime?: string;

  /** Override platform default mock-day cutoff (HH:mm, e.g. 23:59). */
  @IsOptional()
  @IsString()
  mockDayCutoffTime?: string;

  @IsOptional()
  @IsString()
  writingTeacherId?: string;

  @IsOptional()
  @IsString()
  speakingTeacherId?: string;

  /** Not required for grants — student schedules from assigned examiner availability. */
  @IsOptional()
  @IsString()
  speakingSlotId?: string;
}
