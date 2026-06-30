import { IsNotEmpty, IsString } from 'class-validator';

export class ScheduleSpeakingSlotDto {
  @IsString()
  @IsNotEmpty()
  speakingSlotId: string;
}
