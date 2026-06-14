import {
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  country?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(9)
  targetBand?: number;

  @IsOptional()
  @IsIn(['academic', 'general_training'])
  examType?: 'academic' | 'general_training';

  @IsOptional()
  @IsObject()
  notificationPrefs?: Record<string, boolean>;
}
