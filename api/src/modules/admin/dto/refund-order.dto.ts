import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class RefundOrderDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
