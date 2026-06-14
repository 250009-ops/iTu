import { IsBoolean, IsIn, IsOptional } from 'class-validator';

export const SPEAKING_PHASES = [
  'part1',
  'part2-prep',
  'part2-speak',
  'part3',
  'complete',
] as const;

export type SpeakingPhase = (typeof SPEAKING_PHASES)[number];

export class UpdateSpeakingStateDto {
  @IsOptional()
  @IsIn(SPEAKING_PHASES)
  activePhase?: SpeakingPhase;

  @IsOptional()
  @IsBoolean()
  examinerReady?: boolean;

  @IsOptional()
  @IsBoolean()
  endSession?: boolean;
}
