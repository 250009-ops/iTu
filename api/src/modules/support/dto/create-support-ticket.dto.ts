import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

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
  @IsIn([
    'regrade_request',
    'teacher_no_show',
    'technical_issue',
    'payment_dispute',
  ])
  type?:
    | 'regrade_request'
    | 'teacher_no_show'
    | 'technical_issue'
    | 'payment_dispute';

  @IsOptional()
  @IsString()
  enrollmentId?: string;
}
