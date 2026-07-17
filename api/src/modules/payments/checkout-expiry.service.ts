import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BookingsService } from '../bookings/bookings.service';
import { PaymentsService } from './payments.service';

@Injectable()
export class CheckoutExpiryService {
  private readonly logger = new Logger(CheckoutExpiryService.name);

  constructor(
    private prisma: PrismaService,
    private bookings: BookingsService,
    private payments: PaymentsService,
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

    const pending = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.PENDING,
        uzumCheckoutId: { not: null },
        checkoutExpiresAt: { gte: now },
      },
      select: { id: true, orderCode: true },
      take: 50,
    });

    for (const order of pending) {
      try {
        const fulfilled = await this.payments.reconcilePendingOrder(order.id);
        if (fulfilled) {
          this.logger.log(`Reconciled paid checkout ${order.orderCode}`);
        }
      } catch (err) {
        this.logger.warn(
          `Failed to reconcile checkout ${order.orderCode}: ${err instanceof Error ? err.message : err}`,
        );
      }
    }
  }
}
