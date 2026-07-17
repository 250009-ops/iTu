import { IsIn, IsOptional } from 'class-validator';

export class UpdateInstitutionSupportTicketDto {
  @IsIn(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'])
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
}
