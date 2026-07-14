import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import {
  CreditTxnType,
  EnrollmentStatus,
  OrderStatus,
  OrderType,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BookingsService } from '../bookings/bookings.service';
import { LemonSqueezyService } from './lemon-squeezy.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private lemon: LemonSqueezyService,
    @Inject(forwardRef(() => BookingsService))
    private bookings: BookingsService,
  ) {}

  isConfigured(): boolean {
    return this.lemon.isConfigured();
  }

  async handleWebhook(rawBody: string, signature: string | undefined) {
    if (!this.lemon.verifyWebhookSignature(rawBody, signature)) {
      throw new BadRequestException('Invalid webhook signature');
    }

    const payload = JSON.parse(rawBody) as {
      meta?: { event_name?: string; custom_data?: Record<string, string> };
      data?: {
        id?: string;
        attributes?: {
          status?: string;
          first_order_item?: { order_id?: number };
        };
      };
    };

    const eventName = payload.meta?.event_name ?? '';
    const customOrderId =
      payload.meta?.custom_data?.order_id ??
      payload.meta?.custom_data?.orderId;

    if (
      eventName === 'order_created' ||
      eventName === 'order_paid' ||
      eventName === 'order_refunded' ||
      eventName === 'subscription_payment_success'
    ) {
      const lemonOrderId = payload.data?.id ? String(payload.data.id) : undefined;
      const status = payload.data?.attributes?.status;

      if (customOrderId) {
        if (
          eventName === 'order_paid' ||
          eventName === 'subscription_payment_success' ||
          status === 'paid'
        ) {
          await this.fulfillByOrderId(customOrderId, lemonOrderId);
        } else if (eventName === 'order_refunded') {
          await this.markRefundedByOrderId(customOrderId);
        }
      }
    }

    return { received: true };
  }

  async fulfillByOrderId(orderId: string, lemonOrderId?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { enrollment: true },
    });
    if (!order) {
      this.logger.warn(`Webhook order not found: ${orderId}`);
      return;
    }
    if (order.status === OrderStatus.PAID) {
      return;
    }

    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.PAID,
        lemonOrderId: lemonOrderId ?? order.lemonOrderId,
      },
    });

    if (
      order.orderType === OrderType.CREDIT_PACK &&
      order.institutionId &&
      order.creditQuantity
    ) {
      await this.fulfillCreditPack(
        order.institutionId,
        order.creditQuantity,
        order.id,
        order.orderCode,
      );
      return;
    }

    await this.bookings.fulfillPendingPayment(order.id);
  }

  /** Credits an institution's balance and records a PURCHASE ledger entry. */
  private async fulfillCreditPack(
    institutionId: string,
    credits: number,
    orderId: string,
    orderCode: string,
  ) {
    await this.prisma.$transaction(async (tx) => {
      const institution = await tx.institution.update({
        where: { id: institutionId },
        data: { creditBalance: { increment: credits } },
      });
      await tx.institutionCreditTxn.create({
        data: {
          institutionId,
          type: CreditTxnType.PURCHASE,
          delta: credits,
          balanceAfter: institution.creditBalance,
          orderId,
          reference: orderCode,
          note: `Purchased ${credits} credits`,
        },
      });
    });

    this.logger.log(
      `Credited ${credits} credits to institution ${institutionId} (order ${orderCode})`,
    );
  }

  private async markRefundedByOrderId(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.status === OrderStatus.REFUNDED) return;

    await this.prisma.order.update({
      where: { id: order.id },
      data: { status: OrderStatus.REFUNDED },
    });

    if (order.enrollmentId) {
      await this.prisma.enrollment.update({
        where: { id: order.enrollmentId },
        data: { status: EnrollmentStatus.CANCELLED },
      });
    }
  }

  async getOrderStatus(orderCode: string, studentProfileId: string) {
    const order = await this.prisma.order.findFirst({
      where: { orderCode, studentId: studentProfileId },
      include: { enrollment: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    return {
      orderCode: order.orderCode,
      status: order.status.toLowerCase(),
      enrollmentCode: order.enrollment?.enrollmentCode ?? null,
      checkoutUrl: order.checkoutUrl,
      checkoutExpiresAt: order.checkoutExpiresAt,
    };
  }
}
