import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ExamType } from '@prisma/client';

export class PackageContentPoolEntryDto {
  @IsIn(['listening', 'reading', 'writing', 'speaking'])
  skill: 'listening' | 'reading' | 'writing' | 'speaking';

  @IsArray()
  @IsString({ each: true })
  testIds: string[];
}

export class CreatePackageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string;

  @IsOptional()
  @IsEnum(ExamType)
  examType?: ExamType;

  @IsOptional()
  @IsBoolean()
  mostPopular?: boolean;

  @IsOptional()
  @IsNumber()
  rating?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  reviewCount?: number;

  @IsOptional()
  @IsArray()
  skills?: unknown[];

  @IsOptional()
  @IsArray()
  included?: string[];

  @IsOptional()
  @IsArray()
  rules?: string[];

  @IsOptional()
  @IsString()
  listeningTestId?: string;

  @IsOptional()
  @IsString()
  readingTestId?: string;

  @IsOptional()
  @IsString()
  writingTestId?: string;

  @IsOptional()
  @IsString()
  speakingBankId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PackageContentPoolEntryDto)
  contentPool?: PackageContentPoolEntryDto[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdatePackageDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string;

  @IsOptional()
  @IsEnum(ExamType)
  examType?: ExamType;

  @IsOptional()
  @IsBoolean()
  mostPopular?: boolean;

  @IsOptional()
  @IsNumber()
  rating?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  reviewCount?: number;

  @IsOptional()
  @IsArray()
  skills?: unknown[];

  @IsOptional()
  @IsArray()
  included?: string[];

  @IsOptional()
  @IsArray()
  rules?: string[];

  @IsOptional()
  @IsString()
  listeningTestId?: string | null;

  @IsOptional()
  @IsString()
  readingTestId?: string | null;

  @IsOptional()
  @IsString()
  writingTestId?: string | null;

  @IsOptional()
  @IsString()
  speakingBankId?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PackageContentPoolEntryDto)
  contentPool?: PackageContentPoolEntryDto[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
