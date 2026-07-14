import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class PatchInstitutionDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsIn(['PENDING', 'ACTIVE', 'SUSPENDED'])
  status?: 'PENDING' | 'ACTIVE' | 'SUSPENDED';

  @IsOptional()
  @IsNumber()
  @Min(0)
  wholesalePrice?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;
}
