import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { NotificationType, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

const SPEAKING_SLA_MS = 48 * 60 * 60 * 1000;

/**
 * Monitors grading SLAs for Writing and Speaking. Ungraded work past its due
 * time triggers a reminder to the assigned teacher and a breach alert to admins
 * so they can reassign. Runs hourly.
 */
@Injectable()
export class GradingSlaService {
  private readonly logger = new Logger(GradingSlaService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  @Cron('0 0 * * * *')
  async run() {
    const now = new Date();
    const admins = await this.prisma.user.findMany({
      where: { role: UserRole.ADMIN },
      select: { id: true },
    });

    let breaches = 0;

    // Writing: submitted but not graded, past slaDueAt.
    const overdueWriting = await this.prisma.writingSubmission.findMany({
      where: {
        grade: null,
        status: { in: ['PENDING', 'IN_REVIEW'] },
        slaDueAt: { lt: now },
      },
      include: { teacher: { select: { userId: true } } },
    });

    for (const submission of overdueWriting) {
      breaches += 1;
      if (submission.teacher) {
        await this.notifications.create(
          submission.teacher.userId,
          'Writing grading overdue',
          'A writing submission has passed its grading SLA. Please grade it as soon as possible.',
          NotificationType.GRADING,
          '/teacher/writing',
        );
      }
      await this.alertAdmins(
        admins,
        'Writing grading SLA breached',
        submission.teacher
          ? 'A writing submission is overdue. Consider reassigning the teacher.'
          : 'An overdue writing submission has no assigned teacher. Assign one now.',
      );
    }

    // Speaking: session ended/completed, not graded, ended > SLA ago.
    const overdueSpeaking = await this.prisma.speakingSession.findMany({
      where: {
        grade: null,
        status: 'COMPLETED',
        endedAt: { lt: new Date(now.getTime() - SPEAKING_SLA_MS) },
      },
      include: { teacher: { select: { userId: true } } },
    });

    for (const session of overdueSpeaking) {
      breaches += 1;
      if (session.teacher) {
        await this.notifications.create(
          session.teacher.userId,
          'Speaking grading overdue',
          'A speaking session has passed its grading SLA. Please submit your assessment.',
          NotificationType.GRADING,
          '/teacher/speaking',
        );
      }
      await this.alertAdmins(
        admins,
        'Speaking grading SLA breached',
        'A speaking session is overdue for grading. Consider reassigning the examiner.',
      );
    }

    if (breaches > 0) {
      this.logger.warn(`Grading SLA: ${breaches} item(s) breached.`);
    }
  }

  private async alertAdmins(
    admins: { id: string }[],
    title: string,
    body: string,
  ) {
    await Promise.all(
      admins.map((admin) =>
        this.notifications.create(
          admin.id,
          title,
          body,
          NotificationType.SYSTEM,
          '/admin/grading',
        ),
      ),
    );
  }
}
