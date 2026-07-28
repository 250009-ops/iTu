import {
  IsIn,
  IsISO8601,
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
  @IsISO8601()
  dateOfBirth?: string;

  @IsOptional()
  @IsIn(['M', 'F', 'X'])
  sex?: 'M' | 'F' | 'X';

  @IsOptional()
  @IsString()
  @MaxLength(60)
  firstLanguage?: string;

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

  /** Data URL or external URL — same pattern as teacher avatarUrl. */
  @IsOptional()
  @IsString()
  @MaxLength(3_000_000)
  avatarUrl?: string;
}
