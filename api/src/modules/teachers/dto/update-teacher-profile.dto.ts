import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class TeacherPayoutDetailsDto {
  @IsString()
  @MaxLength(120)
  cardHolderName: string;

  /** Digits only after strip (spaces/dashes accepted in input). */
  @Transform(({ value }) =>
    typeof value === 'string' ? value.replace(/\D/g, '') : value,
  )
  @IsString()
  @Matches(/^\d{13,19}$/, {
    message: 'cardNumber must be 13–19 digits',
  })
  cardNumber: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  method?: string;
}

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
  @ValidateNested()
  @Type(() => TeacherPayoutDetailsDto)
  payoutDetails?: TeacherPayoutDetailsDto;
}
