import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateBookingDto {
  @IsString()
  @IsNotEmpty()
  packageId: string;

  @IsDateString()
  mockDate: string;

  @IsString()
  @IsNotEmpty()
  mockTime: string;

  @IsString()
  @IsNotEmpty()
  writingTeacherId: string;

  @IsString()
  @IsNotEmpty()
  speakingTeacherId: string;

  @IsString()
  @IsNotEmpty()
  speakingSlotId: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string;
}
