import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import type { Request } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequestUser } from '../../common/types/request-user';
import { UzumCallbackPayload } from './uzum-checkout.service';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private payments: PaymentsService) {}

  @Public()
  @Get('config')
  getConfig() {
    return { paymentsEnabled: this.payments.isConfigured() };
  }

  @Public()
  @Post('webhooks/uzum-checkout')
  handleUzumWebhook(@Req() req: Request) {
    const payload = req.body as UzumCallbackPayload;
    if (!payload?.orderNumber || !payload?.orderId) {
      throw new BadRequestException('Invalid Uzum callback payload');
    }
    return this.payments.handleUzumCallback(payload);
  }

  @ApiBearerAuth()
  @Get('orders/:orderCode/status')
  @Roles(UserRole.STUDENT)
  getOrderStatus(
    @Param('orderCode') orderCode: string,
    @CurrentUser() user: RequestUser,
  ) {
    if (!user.studentProfileId) {
      throw new ForbiddenException('Student profile required');
    }
    return this.payments.getOrderStatus(orderCode, user.studentProfileId);
  }
}
