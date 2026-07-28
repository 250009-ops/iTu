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
  @Matches(/^\d{2}:(00|20|40)$/, {
    message: 'speakingTime must be on the 20-minute grid (:00, :20, or :40)',
  })
  speakingTime?: string;
}
