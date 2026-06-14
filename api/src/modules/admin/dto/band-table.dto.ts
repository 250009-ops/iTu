import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNumber,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { ExamSkill } from '@prisma/client';

export class BandTableRowDto {
  @IsEnum(ExamSkill)
  skill: ExamSkill;

  @IsNumber()
  @Min(0)
  @Max(40)
  rawScore: number;

  @IsNumber()
  @Min(0)
  @Max(9)
  band: number;
}

export class UpdateBandTableDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BandTableRowDto)
  rows: BandTableRowDto[];
}
