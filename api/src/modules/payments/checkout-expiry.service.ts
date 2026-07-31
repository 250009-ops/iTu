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
        // Payment may have succeeded after the last reconcile tick and before
        // this expiry pass — confirm with Uzum before abandoning the hold.
        const fulfilled = await this.payments.reconcilePendingOrder(order.id);
        if (fulfilled) {
          this.logger.log(
            `Reconciled paid checkout at expiry ${order.orderCode}`,
          );
          continue;
        }
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

    // Recover checkouts that were marked FAILED before a delayed Uzum success
    // (or before expiry started reconciling first).
    const recoverable = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.FAILED,
        uzumCheckoutId: { not: null },
        updatedAt: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
      },
      select: { id: true, orderCode: true },
      take: 20,
    });

    for (const order of recoverable) {
      try {
        const fulfilled = await this.payments.reconcilePendingOrder(order.id);
        if (fulfilled) {
          this.logger.log(`Recovered paid FAILED checkout ${order.orderCode}`);
        }
      } catch (err) {
        this.logger.warn(
          `Failed to recover checkout ${order.orderCode}: ${err instanceof Error ? err.message : err}`,
        );
      }
    }
  }
}
