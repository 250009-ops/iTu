import {
  IsIn,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export class UpdateTeacherRatesDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100_000)
  approvedWritingRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100_000)
  approvedSpeakingRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  platformSharePercent?: number;

  @IsOptional()
  @IsIn(['approved', 'pending', 'suspended'])
  status?: 'approved' | 'pending' | 'suspended';
}
