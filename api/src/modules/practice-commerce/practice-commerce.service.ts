import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, OrderType, PaymentMethod, Prisma } from '@prisma/client';
import { suggestBundlePrice } from '../../common/practice/practice-catalog-pricing';
import {
  normalizeBundle,
  PracticeBundle,
  PracticeDisplayPrices,
} from '../../common/practice/practice.types';
import { PracticeWalletService } from '../../common/practice/practice-wallet.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UzumCheckoutService } from '../payments/uzum-checkout.service';
import { RequestUser } from '../../common/types/request-user';

const CHECKOUT_HOLD_MINUTES = 15;

@Injectable()
export class PracticeCommerceService {
  constructor(
    private prisma: PrismaService,
    private wallet: PracticeWalletService,
    private uzum: UzumCheckoutService,
  ) {}

  async listPackages(activeOnly = true) {
    const packages = await this.prisma.practiceProductPackage.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: [{ mostPopular: 'desc' }, { price: 'asc' }],
    });
    return packages.map((p) => this.formatPackage(p));
  }

  async listAdminPackages() {
    const packages = await this.prisma.practiceProductPackage.findMany({
      orderBy: { updatedAt: 'desc' },
    });
    return packages.map((p) => this.formatPackage(p));
  }

  async getPackage(id: string) {
    const pkg = await this.prisma.practiceProductPackage.findUnique({
      where: { id },
    });
    if (!pkg) throw new NotFoundException('Practice package not found');
    return this.formatPackage(pkg);
  }

  async suggestPackagePrice(bundle: PracticeBundle) {
    const normalized = normalizeBundle(bundle);
    return { suggestedPrice: suggestBundlePrice(normalized), bundle: normalized };
  }

  async createPackage(body: {
    slug: string;
    title: string;
    description?: string;
    price: number;
    currency?: string;
    bundle: PracticeBundle;
    displayPrices?: PracticeDisplayPrices;
    isActive?: boolean;
    mostPopular?: boolean;
  }) {
    const bundle = normalizeBundle(body.bundle);
    if (Object.keys(bundle).length === 0) {
      throw new BadRequestException('Bundle must include at least one credit type');
    }
    return this.prisma.practiceProductPackage.create({
      data: {
        slug: body.slug.trim(),
        title: body.title.trim(),
        description: body.description ?? null,
        price: body.price,
        currency: body.currency ?? 'UZS',
        bundle: bundle as object,
        displayPrices: body.displayPrices
          ? (body.displayPrices as Prisma.InputJsonValue)
          : undefined,
        isActive: body.isActive ?? false,
        mostPopular: body.mostPopular ?? false,
      },
    });
  }

  async updatePackage(
    id: string,
    body: {
      title?: string;
      description?: string;
      price?: number;
      bundle?: PracticeBundle;
      displayPrices?: PracticeDisplayPrices;
      isActive?: boolean;
      mostPopular?: boolean;
    },
  ) {
    await this.getPackage(id);
    const bundle = body.bundle ? normalizeBundle(body.bundle) : undefined;
    return this.prisma.practiceProductPackage.update({
      where: { id },
      data: {
        ...(body.title ? { title: body.title.trim() } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.price !== undefined ? { price: body.price } : {}),
        ...(bundle ? { bundle: bundle as object } : {}),
        ...(body.displayPrices !== undefined
          ? { displayPrices: body.displayPrices }
          : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        ...(body.mostPopular !== undefined ? { mostPopular: body.mostPopular } : {}),
      },
    });
  }

  async deletePackage(id: string) {
    await this.getPackage(id);
    await this.prisma.practiceProductPackage.delete({ where: { id } });
    return { deleted: true };
  }

  async initiateCheckout(packageId: string, user: RequestUser) {
    if (!user.studentProfileId) {
      throw new BadRequestException('Student profile required');
    }

    const pkg = await this.prisma.practiceProductPackage.findUnique({
      where: { id: packageId },
    });
    if (!pkg || !pkg.isActive) {
      throw new NotFoundException('Practice package not available');
    }

    const orderCode = await this.generateCode('PRA-ORD');
    const checkoutExpiresAt = new Date(
      Date.now() + CHECKOUT_HOLD_MINUTES * 60_000,
    );

    const order = await this.prisma.order.create({
      data: {
        orderCode,
        orderType: OrderType.PRACTICE_BUNDLE,
        studentId: user.studentProfileId,
        practicePackageId: pkg.id,
        amount: pkg.price,
        currency: pkg.currency,
        paymentMethod: PaymentMethod.CARD,
        status: OrderStatus.PENDING,
        checkoutExpiresAt,
      },
    });

    if (!this.uzum.isConfigured()) {
      await this.fulfillPracticeOrder(order.id);
      const refreshed = await this.prisma.order.findUnique({
        where: { id: order.id },
      });
      return {
        orderId: order.id,
        orderCode: order.orderCode,
        status: 'paid',
        checkoutUrl: null,
        checkoutExpiresAt: null,
        amount: refreshed?.amount ?? pkg.price,
        currency: pkg.currency,
      };
    }

    const checkout = await this.uzum.createCheckout({
      orderId: order.id,
      orderCode: order.orderCode,
      email: user.email,
      name: user.name,
      amount: pkg.price,
      currency: pkg.currency,
      packageTitle: pkg.title,
      clientId: user.id,
      sessionTimeoutSecs: CHECKOUT_HOLD_MINUTES * 60,
      successPath: '/student/practice/shop?paid=1',
      failurePath: '/student/practice/shop?paid=0',
    });

    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        uzumCheckoutId: checkout.checkoutId,
        checkoutUrl: checkout.checkoutUrl,
      },
    });

    return {
      orderId: order.id,
      orderCode: order.orderCode,
      status: 'pending_payment',
      checkoutUrl: checkout.checkoutUrl,
      checkoutExpiresAt: checkoutExpiresAt.toISOString(),
      amount: pkg.price,
      currency: pkg.currency,
    };
  }

  async fulfillPracticeOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { practicePackage: true },
    });
    if (!order || order.orderType !== OrderType.PRACTICE_BUNDLE) return;
    if (!order.studentId || !order.practicePackage) return;

    const alreadyFulfilled = await this.prisma.practiceCreditTxn.findFirst({
      where: { orderId: order.id, type: 'PURCHASE' },
    });
    if (alreadyFulfilled) {
      if (order.status !== OrderStatus.PAID) {
        await this.prisma.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.PAID },
        });
      }
      return;
    }

    const bundle = normalizeBundle(order.practicePackage.bundle);
    await this.wallet.creditFromBundle(
      order.studentId,
      bundle,
      order.id,
      order.orderCode,
    );

    await this.prisma.order.update({
      where: { id: order.id },
      data: { status: OrderStatus.PAID },
    });
  }

  private formatPackage(pkg: {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    price: number;
    currency: string;
    bundle: unknown;
    displayPrices: unknown;
    isActive: boolean;
    mostPopular: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: pkg.id,
      slug: pkg.slug,
      title: pkg.title,
      description: pkg.description,
      price: pkg.price,
      currency: pkg.currency,
      bundle: normalizeBundle(pkg.bundle),
      displayPrices: (pkg.displayPrices as PracticeDisplayPrices) ?? {},
      isActive: pkg.isActive,
      mostPopular: pkg.mostPopular,
      createdAt: pkg.createdAt,
      updatedAt: pkg.updatedAt,
    };
  }

  private async generateCode(prefix: string): Promise<string> {
    const num = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${num}`;
  }
}
