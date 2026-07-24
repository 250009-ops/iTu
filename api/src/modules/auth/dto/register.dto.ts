import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @Transform(({ value }) => parseFloat(String(value)))
  @IsNumber()
  targetBand: number;

  @IsIn(['academic', 'general_training', 'ACADEMIC', 'GENERAL_TRAINING'])
  examType: string;

  @IsBoolean()
  acceptTerms: boolean;

  /** Optional student referral code from /register?ref=… */
  @IsOptional()
  @IsString()
  @MaxLength(32)
  referralCode?: string;
}
