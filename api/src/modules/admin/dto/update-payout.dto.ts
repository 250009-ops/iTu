import { IsEnum } from 'class-validator';
import { PayoutStatus } from '@prisma/client';

export class UpdatePayoutDto {
  @IsEnum(PayoutStatus)
  status: PayoutStatus;
}
