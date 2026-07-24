import { IsDateString, IsIn } from 'class-validator';

export class ClaimReferralRewardDto {
  @IsIn(['listening', 'reading'])
  skill!: 'listening' | 'reading';

  @IsDateString()
  mockDate!: string;
}
