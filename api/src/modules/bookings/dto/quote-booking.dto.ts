import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class QuoteBookingDto {
  @IsString()
  @IsNotEmpty()
  packageId: string;

  @IsOptional()
  @IsString()
  writingTeacherId?: string;

  @IsOptional()
  @IsString()
  speakingTeacherId?: string;
}
