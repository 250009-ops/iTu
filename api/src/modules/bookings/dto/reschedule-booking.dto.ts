import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RescheduleBookingDto {
  @IsDateString()
  mockDate: string;

  @IsString()
  @IsNotEmpty()
  mockTime: string;

  /** Required when the package includes speaking; omitted for writing-only mocks. */
  @IsOptional()
  @IsString()
  speakingSlotId?: string;
}
