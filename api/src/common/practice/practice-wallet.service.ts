import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PracticeCreditTxnType,
  PracticeCreditType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  creditTypeToWalletField,
  normalizeBundle,
  PracticeBundle,
  PracticeWalletBalanceField,
} from './practice.types';

@Injectable()
export class PracticeWalletService {
  constructor(private prisma: PrismaService) {}

  async getOrCreateWallet(studentId: string) {
    return this.prisma.studentPracticeWallet.upsert({
      where: { studentId },
      create: { studentId },
      update: {},
    });
  }

  async getWalletBalances(studentId: string) {
    const wallet = await this.getOrCreateWallet(studentId);
    return {
      readingPassages: wallet.readingPassages,
      readingQuestionTypes: wallet.readingQuestionTypes,
      listeningSections: wallet.listeningSections,
      listeningQuestionTypes: wallet.listeningQuestionTypes,
      aiWritingEssays: wallet.aiWritingEssays,
    };
  }

  async creditFromBundle(
    studentId: string,
    bundle: PracticeBundle,
    orderId: string,
    reference: string,
  ) {
    const normalized = normalizeBundle(bundle);
    await this.prisma.$transaction(async (tx) => {
      const wallet = await tx.studentPracticeWallet.upsert({
        where: { studentId },
        create: { studentId },
        update: {},
      });

      const updates: Partial<Record<PracticeWalletBalanceField, number>> = {};
      const txns: Prisma.PracticeCreditTxnCreateManyInput[] = [];

      const creditMap: [keyof PracticeBundle, PracticeCreditType][] = [
        ['readingPassages', PracticeCreditType.READING_PASSAGE],
        ['readingQuestionTypes', PracticeCreditType.READING_QUESTION_TYPE],
        ['listeningSections', PracticeCreditType.LISTENING_SECTION],
        ['listeningQuestionTypes', PracticeCreditType.LISTENING_QUESTION_TYPE],
        ['aiWritingEssays', PracticeCreditType.AI_WRITING_ESSAY],
      ];

      let current = { ...wallet };
      for (const [bundleKey, creditType] of creditMap) {
        const delta = normalized[bundleKey] ?? 0;
        if (delta <= 0) continue;
        const field = creditTypeToWalletField(creditType);
        const nextBalance = (current[field] as number) + delta;
        updates[field] = nextBalance;
        txns.push({
          studentId,
          type: PracticeCreditTxnType.PURCHASE,
          creditType,
          delta,
          balanceAfter: nextBalance,
          orderId,
          reference,
          note: `Purchased ${delta} ${creditType}`,
        });
        current = { ...current, [field]: nextBalance };
      }

      if (Object.keys(updates).length === 0) return;

      await tx.studentPracticeWallet.update({
        where: { studentId },
        data: updates,
      });
      await tx.practiceCreditTxn.createMany({ data: txns });
    });
  }

  async consumeCredit(
    studentId: string,
    creditType: PracticeCreditType,
    opts?: { attemptId?: string; sessionId?: string; reference?: string },
  ) {
    const field = creditTypeToWalletField(creditType);
    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.studentPracticeWallet.findUnique({
        where: { studentId },
      });
      if (!wallet || (wallet[field] as number) < 1) {
        throw new BadRequestException(
          `Insufficient ${creditType.replace(/_/g, ' ').toLowerCase()} credits`,
        );
      }
      const balanceAfter = (wallet[field] as number) - 1;
      await tx.studentPracticeWallet.update({
        where: { studentId },
        data: { [field]: balanceAfter },
      });
      await tx.practiceCreditTxn.create({
        data: {
          studentId,
          type: PracticeCreditTxnType.CONSUME,
          creditType,
          delta: -1,
          balanceAfter,
          attemptId: opts?.attemptId,
          sessionId: opts?.sessionId,
          reference: opts?.reference,
          note: `Consumed 1 ${creditType}`,
        },
      });
      return balanceAfter;
    });
  }

  async refundCredit(
    studentId: string,
    creditType: PracticeCreditType,
    reference?: string,
  ) {
    const field = creditTypeToWalletField(creditType);
    await this.prisma.$transaction(async (tx) => {
      const wallet = await tx.studentPracticeWallet.upsert({
        where: { studentId },
        create: { studentId },
        update: {},
      });
      const balanceAfter = (wallet[field] as number) + 1;
      await tx.studentPracticeWallet.update({
        where: { studentId },
        data: { [field]: balanceAfter },
      });
      await tx.practiceCreditTxn.create({
        data: {
          studentId,
          type: PracticeCreditTxnType.REFUND,
          creditType,
          delta: 1,
          balanceAfter,
          reference,
          note: `Refunded 1 ${creditType}`,
        },
      });
    });
  }

  async adminGrantCredits(
    studentId: string,
    credits: Partial<Record<PracticeCreditType, number>>,
    note?: string,
  ) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { id: studentId },
    });
    if (!student) throw new NotFoundException('Student not found');

    await this.prisma.$transaction(async (tx) => {
      const wallet = await tx.studentPracticeWallet.upsert({
        where: { studentId },
        create: { studentId },
        update: {},
      });
      const updates: Partial<Record<PracticeWalletBalanceField, number>> = {};
      const txns: Prisma.PracticeCreditTxnCreateManyInput[] = [];
      let current = { ...wallet };

      for (const [creditType, delta] of Object.entries(credits)) {
        if (!delta || delta <= 0) continue;
        const field = creditTypeToWalletField(
          creditType as PracticeCreditType,
        );
        const nextBalance = (current[field] as number) + delta;
        updates[field] = nextBalance;
        txns.push({
          studentId,
          type: PracticeCreditTxnType.ADJUSTMENT,
          creditType: creditType as PracticeCreditType,
          delta,
          balanceAfter: nextBalance,
          note: note ?? 'Admin complimentary grant',
        });
        current = { ...current, [field]: nextBalance };
      }

      if (Object.keys(updates).length === 0) {
        throw new BadRequestException('No credits to grant');
      }

      await tx.studentPracticeWallet.update({
        where: { studentId },
        data: updates,
      });
      await tx.practiceCreditTxn.createMany({ data: txns });
    });
  }
}
