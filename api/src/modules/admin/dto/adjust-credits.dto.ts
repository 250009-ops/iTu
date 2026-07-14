import { IsInt, IsOptional, IsString, MaxLength, NotEquals } from 'class-validator';

export class AdjustCreditsDto {
  /** Signed adjustment: positive to grant, negative to deduct. */
  @IsInt()
  @NotEquals(0)
  delta: number;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  note?: string;
}
