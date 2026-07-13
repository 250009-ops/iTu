import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export const SUPPORT_TICKET_TYPES = [
  'regrade_request',
  'teacher_no_show',
  'technical_issue',
  'payment_dispute',
  'student_conduct',
] as const;

export type SupportTicketType = (typeof SUPPORT_TICKET_TYPES)[number];

export class CreateSupportTicketDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  subject: string;

  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  message: string;

  @IsOptional()
  @IsIn([...SUPPORT_TICKET_TYPES])
  type?: SupportTicketType;

  @IsOptional()
  @IsString()
  enrollmentId?: string;

  /** Free-text context (session, student name, enrollment code) for admin triage. */
  @IsOptional()
  @IsString()
  @MaxLength(300)
  relatedRef?: string;
}
