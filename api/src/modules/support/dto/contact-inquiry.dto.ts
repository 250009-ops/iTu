import {
  IsEmail,
  IsIn,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

const CONTACT_TOPICS = [
  'General',
  'Technical',
  'Billing',
  'Examiner',
  'Institution',
  'Press',
] as const;

export class ContactInquiryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsIn(CONTACT_TOPICS)
  topic: (typeof CONTACT_TOPICS)[number];

  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  message: string;
}
