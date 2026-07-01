import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateGrantEnrollmentDto {
  @IsString()
  @IsNotEmpty()
  packageId: string;

  @IsDateString()
  mockDate: string;

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
