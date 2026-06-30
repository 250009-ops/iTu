import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EnrollmentStatus } from '@prisma/client';
import { shouldMarkMissed } from '../../common/mock-day-policy';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class EnrollmentLifecycleService {
  private readonly logger = new Logger(EnrollmentLifecycleService.name);

  constructor(private prisma: PrismaService) {}

  /** Mark a single enrollment missed when cutoff passed without a start. */
  async markMissedIfEligible(enrollmentId: string, now = new Date()): Promise<boolean> {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        examSession: { include: { sectionAttempts: true } },
      },
    });
    if (!enrollment?.examSession) return false;
    if (
      !shouldMarkMissed(
        enrollment,
        enrollment.examSession,
        now,
      )
    ) {
      return false;
    }

    await this.prisma.enrollment.update({
      where: { id: enrollment.id },
      data: {
        status: EnrollmentStatus.MISSED,
        missedAt: now,
      },
    });
    return true;
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async markMissedMocksJob(): Promise<void> {
    const now = new Date();
    const candidates = await this.prisma.enrollment.findMany({
      where: {
        status: EnrollmentStatus.ENROLLED,
        examStartedAt: null,
        mockDayCutoffAt: { lt: now },
      },
      include: {
        examSession: { include: { sectionAttempts: true } },
      },
      take: 100,
    });

    let marked = 0;
    for (const enrollment of candidates) {
      if (!enrollment.examSession) continue;
      if (
        shouldMarkMissed(enrollment, enrollment.examSession, now)
      ) {
        await this.prisma.enrollment.update({
          where: { id: enrollment.id },
          data: {
            status: EnrollmentStatus.MISSED,
            missedAt: now,
          },
        });
        marked += 1;
      }
    }
    if (marked > 0) {
      this.logger.log(`Marked ${marked} enrollment(s) as MISSED`);
    }
  }
}
