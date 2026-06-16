import { IsIn, IsOptional, IsString } from 'class-validator';

export class ReviewIntegrityDto {
  @IsIn(['clear', 'uphold'])
  decision: 'clear' | 'uphold';

  @IsString()
  @IsOptional()
  note?: string;
}
