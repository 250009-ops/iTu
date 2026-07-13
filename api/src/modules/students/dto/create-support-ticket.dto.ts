import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { SUPPORT_TICKET_TYPES } from '../../support/dto/create-support-ticket.dto';

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
  type?: (typeof SUPPORT_TICKET_TYPES)[number];

  @IsOptional()
  @IsString()
  enrollmentId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  relatedRef?: string;
}
