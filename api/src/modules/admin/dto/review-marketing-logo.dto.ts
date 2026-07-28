import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewMarketingLogoDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
