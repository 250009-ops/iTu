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
import {
  UzumCallbackPayload,
  UzumCheckoutService,
} from './uzum-checkout.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private uzum: UzumCheckoutService,
    @Inject(forwardRef(() => BookingsService))
    private bookings: BookingsService,
  ) {}

  isConfigured(): boolean {
    return this.uzum.isConfigured();
  }

  async handleUzumCallback(payload: UzumCallbackPayload) {
    const orderCode = payload.orderNumber?.trim();
    if (!orderCode) {
      throw new BadRequestException('Missing orderNumber in callback');
    }

    const order = await this.prisma.order.findUnique({
      where: { orderCode },
    });
    if (!order) {
      this.logger.warn(`Uzum callback for unknown order: ${orderCode}`);
      return { received: true };
    }

    if (this.uzum.isSuccessfulRefundCallback(payload)) {
      await this.markRefundedByOrderId(order.id);
      return { received: true };
    }

    if (!this.uzum.isSuccessfulPaymentCallback(payload)) {
      return { received: true };
    }

    const confirmed = await this.confirmAndFulfill(order.id, payload.orderId);
    if (!confirmed) {
      this.logger.warn(
        `Uzum callback for ${orderCode} could not be confirmed via getOrderStatus`,
      );
    }

    return { received: true };
  }

  /** Reconcile a pending order against Uzum and fulfill when paid. */
  async reconcilePendingOrder(orderId: string): Promise<boolean> {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.status !== OrderStatus.PENDING || !order.uzumCheckoutId) {
      return false;
    }

    return this.confirmAndFulfill(order.id, order.uzumCheckoutId);
  }

  private async confirmAndFulfill(orderId: string, uzumOrderId: string): Promise<boolean> {
    const status = await this.uzum.getOrderStatus(uzumOrderId);
    if (!status || !this.uzum.isPaidStatus(status.status)) {
      return false;
    }

    await this.fulfillByOrderId(orderId, status.orderId);
    return true;
  }

  async fulfillByOrderId(orderId: string, uzumOrderId?: string) {
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
        uzumOrderId: uzumOrderId ?? order.uzumOrderId,
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

    if (order.status === OrderStatus.PENDING && order.uzumCheckoutId) {
      await this.reconcilePendingOrder(order.id);
      const refreshed = await this.prisma.order.findFirst({
        where: { orderCode, studentId: studentProfileId },
        include: { enrollment: true },
      });
      if (refreshed) {
        return this.formatOrderStatus(refreshed);
      }
    }

    return this.formatOrderStatus(order);
  }

  private formatOrderStatus(
    order: {
      orderCode: string;
      status: OrderStatus;
      checkoutUrl: string | null;
      checkoutExpiresAt: Date | null;
      enrollment: { enrollmentCode: string } | null;
    },
  ) {
    return {
      orderCode: order.orderCode,
      status: order.status.toLowerCase(),
      enrollmentCode: order.enrollment?.enrollmentCode ?? null,
      checkoutUrl: order.checkoutUrl,
      checkoutExpiresAt: order.checkoutExpiresAt,
    };
  }
}
