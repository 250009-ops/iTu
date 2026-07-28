import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  EnrollmentStatus,
  ExamSessionState,
  NotificationType,
  SlotStatus,
  SpeakingSessionStatus,
} from '@prisma/client';
import {
  shouldMarkMissed,
  shouldMarkSpeakingNoShow,
  shouldMissEnrollmentForSpeakingNoShow,
} from '../../common/mock-day-policy';
import {
  studentMockDayPath,
  studentResultsPath,
} from '../../common/student-portal-paths';
import { PrismaService } from '../../prisma/prisma.service';
import { packageExamSkills } from '../content/package-skills';
import { NotificationsService } from '../notifications/notifications.service';
import { ResultsReleaseService } from '../results/results-release.service';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class EnrollmentLifecycleService {
  private readonly logger = new Logger(EnrollmentLifecycleService.name);

  constructor(
    private prisma: PrismaService,
    private settings: SettingsService,
    private notifications: NotificationsService,
    private resultsRelease: ResultsReleaseService,
  ) {}

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

  /**
   * After the speaking late-join window closes without the student joining,
   * mark the session NO_SHOW and either miss the enrollment (reappoint path)
   * or release remaining skills without a speaking grade.
   */
  async markSpeakingNoShowIfEligible(
    enrollmentId: string,
    now = new Date(),
  ): Promise<boolean> {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        package: true,
        student: { include: { user: true } },
        examSession: {
          include: {
            sectionAttempts: { include: { speakingSession: true } },
          },
        },
      },
    });
    if (!enrollment?.examSession) return false;
    if (
      enrollment.status !== EnrollmentStatus.ENROLLED &&
      enrollment.status !== EnrollmentStatus.IN_PROGRESS
    ) {
      return false;
    }

    const speakingAttempt = enrollment.examSession.sectionAttempts.find(
      (attempt) => attempt.speakingSession != null,
    );
    const speakingSession = speakingAttempt?.speakingSession;
    if (!speakingSession) return false;

    const timers = await this.settings.getMockDayTimers();
    if (
      !shouldMarkSpeakingNoShow(
        speakingSession,
        timers.lateJoinMin,
        now,
      )
    ) {
      return false;
    }

    return this.applySpeakingNoShow({
      enrollmentId: enrollment.id,
      enrollmentCode: enrollment.enrollmentCode,
      institutionId: enrollment.institutionId,
      studentUserId: enrollment.student.userId,
      speakingSessionId: speakingSession.id,
      sectionAttemptId: speakingSession.sectionAttemptId,
      speakingSlotId: enrollment.speakingSlotId,
      packageSkills: packageExamSkills(enrollment.package.skills).map(String),
      sectionAttempts: enrollment.examSession.sectionAttempts.map((a) => ({
        skill: a.skill,
        submittedAt: a.submittedAt,
      })),
      examSessionId: enrollment.examSession.id,
      now,
    });
  }

  /** Mark no-show for a specific speaking session when join is attempted too late. */
  async markSpeakingNoShowBySessionId(
    speakingSessionId: string,
    now = new Date(),
  ): Promise<boolean> {
    const speakingSession = await this.prisma.speakingSession.findUnique({
      where: { id: speakingSessionId },
      include: {
        sectionAttempt: {
          include: {
            session: {
              include: {
                enrollment: {
                  include: {
                    package: true,
                    student: { include: { user: true } },
                    examSession: {
                      include: {
                        sectionAttempts: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!speakingSession) return false;

    const enrollment = speakingSession.sectionAttempt.session.enrollment;
    if (
      enrollment.status !== EnrollmentStatus.ENROLLED &&
      enrollment.status !== EnrollmentStatus.IN_PROGRESS
    ) {
      return false;
    }

    const timers = await this.settings.getMockDayTimers();
    if (
      !shouldMarkSpeakingNoShow(
        speakingSession,
        timers.lateJoinMin,
        now,
      )
    ) {
      return false;
    }

    const examSession = enrollment.examSession;
    if (!examSession) return false;

    return this.applySpeakingNoShow({
      enrollmentId: enrollment.id,
      enrollmentCode: enrollment.enrollmentCode,
      institutionId: enrollment.institutionId,
      studentUserId: enrollment.student.userId,
      speakingSessionId: speakingSession.id,
      sectionAttemptId: speakingSession.sectionAttemptId,
      speakingSlotId: enrollment.speakingSlotId,
      packageSkills: packageExamSkills(enrollment.package.skills).map(String),
      sectionAttempts: examSession.sectionAttempts.map((a) => ({
        skill: a.skill,
        submittedAt: a.submittedAt,
      })),
      examSessionId: examSession.id,
      now,
    });
  }

  private async applySpeakingNoShow(input: {
    enrollmentId: string;
    enrollmentCode: string;
    institutionId: string | null;
    studentUserId: string;
    speakingSessionId: string;
    sectionAttemptId: string;
    speakingSlotId: string | null;
    packageSkills: string[];
    sectionAttempts: { skill: string; submittedAt: Date | null }[];
    examSessionId: string;
    now: Date;
  }): Promise<boolean> {
    const missEnrollment = shouldMissEnrollmentForSpeakingNoShow(
      input.packageSkills,
      input.sectionAttempts,
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.speakingSession.updateMany({
        where: {
          id: input.speakingSessionId,
          status: {
            in: [SpeakingSessionStatus.SCHEDULED, SpeakingSessionStatus.WAITING],
          },
          startedAt: null,
        },
        data: {
          status: SpeakingSessionStatus.NO_SHOW,
          endedAt: input.now,
        },
      });

      await tx.sectionAttempt.updateMany({
        where: { id: input.sectionAttemptId, submittedAt: null },
        data: { submittedAt: input.now },
      });

      if (input.speakingSlotId) {
        await tx.teacherSlot.updateMany({
          where: {
            id: input.speakingSlotId,
            status: SlotStatus.BOOKED,
          },
          data: { status: SlotStatus.AVAILABLE, version: { increment: 1 } },
        });
        await tx.enrollment.update({
          where: { id: input.enrollmentId },
          data: { speakingSlotId: null },
        });
      }

      if (missEnrollment) {
        await tx.enrollment.update({
          where: { id: input.enrollmentId },
          data: {
            status: EnrollmentStatus.MISSED,
            missedAt: input.now,
          },
        });
      } else {
        await tx.examSession.update({
          where: { id: input.examSessionId },
          data: { state: ExamSessionState.AWAITING_GRADING },
        });
        await tx.enrollment.update({
          where: { id: input.enrollmentId },
          data: { status: EnrollmentStatus.AWAITING_RESULTS },
        });
      }
    });

    if (missEnrollment) {
      await this.notifications.create(
        input.studentUserId,
        'Speaking marked absent',
        `You missed the late-join window for ${input.enrollmentCode}. Contact your centre admin to reappoint this mock.`,
        NotificationType.SYSTEM,
        studentMockDayPath(input.institutionId),
      );
    } else {
      await this.notifications.create(
        input.studentUserId,
        'Speaking marked absent',
        `You missed the late-join window for speaking on ${input.enrollmentCode}. Other completed modules can still release when graded.`,
        NotificationType.SYSTEM,
        studentResultsPath(input.institutionId, input.enrollmentCode),
      );
      await this.resultsRelease.tryRelease(
        input.enrollmentId,
        input.studentUserId,
      );
    }

    this.logger.log(
      `Speaking no-show for enrollment ${input.enrollmentId}` +
        (missEnrollment ? ' (enrollment MISSED)' : ' (partial results path)'),
    );
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

  @Cron(CronExpression.EVERY_5_MINUTES)
  async markSpeakingNoShowsJob(): Promise<void> {
    const now = new Date();
    const timers = await this.settings.getMockDayTimers();
    const candidates = await this.prisma.speakingSession.findMany({
      where: {
        status: {
          in: [SpeakingSessionStatus.SCHEDULED, SpeakingSessionStatus.WAITING],
        },
        startedAt: null,
        scheduledAt: { lt: now },
      },
      include: {
        sectionAttempt: {
          include: {
            session: {
              select: { enrollmentId: true },
            },
          },
        },
      },
      take: 100,
    });

    let marked = 0;
    for (const session of candidates) {
      if (
        !shouldMarkSpeakingNoShow(session, timers.lateJoinMin, now)
      ) {
        continue;
      }
      const enrollmentId = session.sectionAttempt.session.enrollmentId;
      if (await this.markSpeakingNoShowIfEligible(enrollmentId, now)) {
        marked += 1;
      }
    }
    if (marked > 0) {
      this.logger.log(`Marked ${marked} speaking session(s) as NO_SHOW`);
    }
  }
}
