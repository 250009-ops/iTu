import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequestUser } from '../../common/types/request-user';
import { ContactInquiryDto } from './dto/contact-inquiry.dto';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import { SupportService } from './support.service';

@ApiTags('support')
@Controller('support')
export class SupportController {
  constructor(private support: SupportService) {}

  @Public()
  @Post('contact')
  submitContact(@Body() dto: ContactInquiryDto) {
    return this.support.submitContactInquiry(dto);
  }

  @ApiBearerAuth()
  @Get('centre-contact')
  getCentreContact(@CurrentUser() user: RequestUser) {
    return this.support.getCentreContact(user);
  }

  @ApiBearerAuth()
  @Get('tickets/mine')
  listMyTickets(@CurrentUser() user: RequestUser) {
    return this.support.listMyTickets(user);
  }

  @ApiBearerAuth()
  @Post('tickets')
  createTicket(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateSupportTicketDto,
  ) {
    return this.support.createTicket(user, dto);
  }
}
