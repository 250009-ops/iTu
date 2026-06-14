import { IsDateString, IsNotEmpty, IsString } from 'class-validator';

export class RescheduleBookingDto {
  @IsDateString()
  mockDate: string;

  @IsString()
  @IsNotEmpty()
  mockTime: string;

  @IsString()
  @IsNotEmpty()
  speakingSlotId: string;
}
