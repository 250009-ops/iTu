import { Transform } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const TEACHER_LANGUAGES = ['Uzbek', 'English', 'Russian'] as const;

export class RegisterTeacherDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  fullName: string;

  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  @Transform(({ value }) => parseFloat(String(value)))
  @IsNumber()
  @Min(6.5)
  @Max(9)
  ieltsWritingBand: number;

  @Transform(({ value }) => parseFloat(String(value)))
  @IsNumber()
  @Min(6.5)
  @Max(9)
  ieltsSpeakingBand: number;

  @Transform(({ value }) => parseInt(String(value), 10))
  @IsInt()
  @Min(1)
  @Max(50)
  yearsExperience: number;

  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value) as unknown;
        return Array.isArray(parsed) ? parsed : [value];
      } catch {
        return value.split(',').map((s: string) => s.trim()).filter(Boolean);
      }
    }
    return [];
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsIn(TEACHER_LANGUAGES, { each: true })
  languages: string[];

  @IsString()
  @IsNotEmpty()
  @MinLength(80)
  @MaxLength(500)
  bio: string;

  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value) as unknown;
        return Array.isArray(parsed) ? parsed : [value];
      } catch {
        return value.split(',').map((s: string) => s.trim()).filter(Boolean);
      }
    }
    return [];
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  credentials: string[];

  @Transform(({ value }) => parseFloat(String(value)))
  @IsNumber()
  @Min(1)
  @Max(100_000)
  requestedWritingRate: number;

  @Transform(({ value }) => parseFloat(String(value)))
  @IsNumber()
  @Min(1)
  @Max(100_000)
  requestedSpeakingRate: number;

  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  acceptTerms: boolean;
}
