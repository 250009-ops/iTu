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

const TEACHER_QUALIFICATIONS = [
  'CELTA',
  'DELTA',
  'IELTS Examiner Certification',
  'MA TESOL',
  'Ex-IDP Examiner',
  'PGCE with ELT',
  'Other',
] as const;

const TEACHER_SPECIALITIES = ['writing', 'speaking', 'both'] as const;

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
  @Min(7.5)
  @Max(9)
  ieltsWritingBand: number;

  @Transform(({ value }) => parseFloat(String(value)))
  @IsNumber()
  @Min(7.5)
  @Max(9)
  ieltsSpeakingBand: number;

  @IsIn(TEACHER_SPECIALITIES)
  speciality: (typeof TEACHER_SPECIALITIES)[number];

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
  @IsIn(TEACHER_QUALIFICATIONS, { each: true })
  qualifications: string[];

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
  @MaxLength(60, { each: true })
  languages: string[];

  @IsString()
  @MinLength(80)
  @MaxLength(2000)
  bio: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  acceptTerms: boolean;
}
