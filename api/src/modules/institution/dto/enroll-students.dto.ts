import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class EnrollStudentsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  studentIds: string[];

  @IsString()
  @IsNotEmpty()
  packageId: string;

  @IsDateString()
  mockDate: string;

  @IsOptional()
  @IsString()
  writingTeacherId?: string;

  @IsOptional()
  @IsString()
  speakingTeacherId?: string;

  /** Book an existing examiner availability slot (preferred when slots exist). */
  @IsOptional()
  @IsString()
  speakingSlotId?: string;

  /**
   * Create/book a one-off speaking time on mockDate (HH:mm) when the examiner
   * has no pre-generated availability. Ignored when speakingSlotId is set.
   */
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'speakingTime must be HH:mm' })
  speakingTime?: string;
}
