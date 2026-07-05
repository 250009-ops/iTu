import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BookingsService } from '../bookings/bookings.service';

@Injectable()
export class CheckoutExpiryService {
  private readonly logger = new Logger(CheckoutExpiryService.name);

  constructor(
    private prisma: PrismaService,
    private bookings: BookingsService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async expireStaleCheckouts() {
    const now = new Date();
    const stale = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.PENDING,
        checkoutExpiresAt: { lt: now },
      },
      select: { id: true, orderCode: true },
      take: 50,
    });

    for (const order of stale) {
      try {
        await this.bookings.cancelPendingCheckout(order.id);
        this.logger.log(`Expired checkout ${order.orderCode}`);
      } catch (err) {
        this.logger.warn(
          `Failed to expire checkout ${order.orderCode}: ${err instanceof Error ? err.message : err}`,
        );
      }
    }
  }
}
