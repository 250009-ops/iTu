import { IsDateString, IsIn } from 'class-validator';

export class ClaimWelcomePromoDto {
  @IsIn(['listening', 'reading'])
  skill!: 'listening' | 'reading';

  @IsDateString()
  mockDate!: string;
}
