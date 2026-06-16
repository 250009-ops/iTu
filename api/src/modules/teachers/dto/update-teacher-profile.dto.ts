import {
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateTeacherProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;

  @IsOptional()
  @IsIn(['writing', 'speaking', 'both'])
  speciality?: 'writing' | 'speaking' | 'both';

  @IsOptional()
  @IsString()
  @MaxLength(3_000_000)
  avatarUrl?: string;

  @IsOptional()
  @IsObject()
  notificationPrefs?: Record<string, boolean>;

  @IsOptional()
  @IsObject()
  payoutDetails?: {
    bankName?: string;
    accountName?: string;
    accountLast4?: string;
    method?: string;
  };
}
