import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PayoutStatus,
  Prisma,
  SlotStatus,
  TeacherSpeciality,
  UserRole,
  NotificationType,
  ExamSkill,
} from '@prisma/client';
import {
  assertTeacherSkillAccess,
  teacherCanAccessSpeaking,
  teacherCanAccessWriting,
} from '../../common/teacher-speciality';
import { RequestUser } from '../../common/types/request-user';
import { formatMoney } from '../../common/format-money';
import {
  hasPayoutCardDetails,
  isValidCardNumber,
  normalizeCardNumber,
  type TeacherPayoutDetails,
} from '../../common/payout-card';
import {
  isPayoutRowRequestable,
  summarizeTeacherPayouts,
} from '../../common/payout-balances';
import {
  addCalendarDaysIso,
  calendarDateIsoInTimeZone,
  weekdayIndexInTimeZone,
  zonedWallClockToUtc,
} from '../../common/mock-day-policy';
import {
  assertSpeakingGridTime,
  ceilSpeakingGridTime,
  floorSpeakingGridTime,
  hhMmFromMinutes,
  minutesFromHhMm,
  SPEAKING_SLOT_DURATION_MINUTES,
} from '../../common/speaking-slot-grid';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SettingsService } from '../settings/settings.service';
import { UpdateTeacherProfileDto } from './dto/update-teacher-profile.dto';

function isWritingVisibleToTeacher(
  aiEvaluation: { status: string } | null,
): boolean {
  const aiConfigured = Boolean(process.env.OPENAI_API_KEY?.trim());
  if (!aiConfigured) return true;
  if (!aiEvaluation) return false;
  const status = aiEvaluation.status.toUpperCase();
  return status === 'READY' || status === 'FAILED';
}

@Injectable()
export class TeachersService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private settings: SettingsService,
  ) {}

  async getDashboard(user: RequestUser) {
    const teacher = await this.requireTeacher(user);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const speakingToday = await this.prisma.speakingSession.findMany({
      where: {
        teacherId: teacher.id,
        scheduledAt: { gte: today, lt: tomorrow },
      },
      include: {
        sectionAttempt: {
          include: {
            session: {
              include: {
                enrollment: {
                  include: { student: { include: { user: true } } },
                },
              },
            },
          },
        },
      },
    });

    const writingQueue = await this.countVisibleWritingQueue(teacher.id);

    const speakingQueue = await this.prisma.speakingSession.count({
      where: {
        teacherId: teacher.id,
        status: 'COMPLETED',
        grade: null,
      },
    });

    return {
      stats: {
        sessionsToday: speakingToday.length,
        writingQueue,
        speakingQueue,
        rating: teacher.rating,
        totalEarned: teacher.totalEarned,
      },
      speakingSchedule: speakingToday.map((s) => ({
        id: s.id,
        studentName:
          s.sectionAttempt.session.enrollment.student.user.name,
        scheduledAt: s.scheduledAt,
        status: s.status.toLowerCase(),
      })),
    };
  }

  async getNavBadgeCounts(user: RequestUser) {
    const teacher = await this.requireTeacher(user);
    const writing = teacherCanAccessWriting(teacher.speciality)
      ? await this.countVisibleWritingQueue(teacher.id)
      : 0;
    const speaking = teacherCanAccessSpeaking(teacher.speciality)
      ? await this.prisma.speakingSession.count({
          where: {
            teacherId: teacher.id,
            status: 'COMPLETED',
            grade: null,
          },
        })
      : 0;
    return { speaking, writing };
  }

  async getSpeakingSessions(user: RequestUser) {
    const teacher = await this.requireTeacher(user);
    assertTeacherSkillAccess(teacher.speciality, 'speaking');
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const sessions = await this.prisma.speakingSession.findMany({
      where: { teacherId: teacher.id },
      include: {
        grade: true,
        sectionAttempt: {
          include: {
            session: {
              include: {
                enrollment: {
                  include: {
                    student: { include: { user: true } },
                    package: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    const mapped = sessions.map((s) => {
      const scheduledAt = s.scheduledAt;
      const endsAt = scheduledAt
        ? new Date(scheduledAt.getTime() + 20 * 60_000)
        : null;
      const enrollment = s.sectionAttempt.session.enrollment;
      const studentName = enrollment.student.user.name;
      const examType = enrollment.package.examType;

      let uiStatus:
        | 'upcoming'
        | 'live'
        | 'awaiting_grade'
        | 'graded'
        | 'no_show'
        | 'cancelled';
      if (s.grade) {
        uiStatus = 'graded';
      } else if (s.status === 'NO_SHOW') {
        uiStatus = 'no_show';
      } else if (s.status === 'COMPLETED') {
        uiStatus = 'awaiting_grade';
      } else if (s.status === 'ACTIVE' || s.status === 'WAITING') {
        uiStatus = 'live';
      } else if (s.status === 'CANCELLED') {
        uiStatus = 'cancelled';
      } else {
        uiStatus = 'upcoming';
      }

      return {
        id: s.id,
        enrollmentId: enrollment.id,
        enrollmentCode: enrollment.enrollmentCode,
        sessionCode: s.sectionAttempt.session.sessionCode,
        studentName,
        scheduledAt,
        endsAt,
        status: s.status.toLowerCase(),
        uiStatus,
        examType: examType.toLowerCase(),
        packageTitle: enrollment.package.title,
        grade: s.grade
          ? {
              overallBand: s.grade.overallBand,
              criteriaScores: s.grade.criteriaScores as Record<string, number>,
            }
          : null,
        recordingUrl: s.recordingUrl,
      };
    });

    const todaySessions = mapped.filter((s) => {
      if (!s.scheduledAt) return false;
      const d = new Date(s.scheduledAt);
      return d >= today && d < tomorrow;
    });

    const upcoming = mapped.filter((s) => {
      if (!s.scheduledAt) return false;
      const d = new Date(s.scheduledAt);
      return d >= tomorrow && (s.uiStatus === 'upcoming' || s.uiStatus === 'live');
    });

    const completed = mapped.filter((s) => s.uiStatus === 'graded');

    // Completed but ungraded — includes past days so badge backlog is visible in the hub.
    const awaitingGrade = mapped
      .filter((s) => s.uiStatus === 'awaiting_grade')
      .sort((a, b) => {
        const at = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
        const bt = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0;
        return at - bt;
      });

    const actionable = mapped.filter(
      (s) =>
        s.uiStatus === 'upcoming' ||
        s.uiStatus === 'live' ||
        s.uiStatus === 'awaiting_grade',
    );
    const nextSession =
      actionable.find((s) => s.scheduledAt && new Date(s.scheduledAt) >= now) ??
      actionable.find((s) => s.uiStatus === 'live') ??
      awaitingGrade[0] ??
      null;

    let minutesUntilNext: number | null = null;
    if (
      nextSession?.scheduledAt &&
      nextSession.uiStatus !== 'awaiting_grade'
    ) {
      minutesUntilNext = Math.max(
        0,
        Math.round(
          (new Date(nextSession.scheduledAt).getTime() - now.getTime()) /
            60_000,
        ),
      );
    }

    return {
      today: todaySessions,
      upcoming,
      awaitingGrade,
      completed,
      counts: {
        today: todaySessions.length,
        upcoming: upcoming.length,
        awaitingGrade: awaitingGrade.length,
        completed: completed.length,
      },
      nextSession,
      minutesUntilNext,
    };
  }

  async getAvailability(user: RequestUser, weekStart?: string) {
    const teacher = await this.requireTeacher(user);
    this.assertMarketplaceTeacher(teacher);

    const weekStartDate = weekStart ? new Date(weekStart) : this.getMonday(new Date());
    weekStartDate.setHours(0, 0, 0, 0);
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekStartDate.getDate() + 7);

    const now = new Date();

    const [weekly, weekSlots, upcomingSlots] = await Promise.all([
      this.prisma.teacherAvailability.findMany({
        where: { teacherId: teacher.id },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      }),
      this.prisma.teacherSlot.findMany({
        where: {
          teacherId: teacher.id,
          startsAt: { gte: weekStartDate, lt: weekEndDate },
        },
        orderBy: { startsAt: 'asc' },
        include: {
          enrollments: {
            take: 1,
            include: {
              student: { include: { user: true } },
              examSession: {
                include: {
                  sectionAttempts: {
                    where: { skill: ExamSkill.SPEAKING },
                    include: { speakingSession: true },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.teacherSlot.findMany({
        where: {
          teacherId: teacher.id,
          status: SlotStatus.BOOKED,
          startsAt: { gte: now },
        },
        orderBy: { startsAt: 'asc' },
        take: 5,
        include: {
          enrollments: {
            take: 1,
            include: {
              student: { include: { user: true } },
              examSession: {
                include: {
                  sectionAttempts: {
                    where: { skill: ExamSkill.SPEAKING },
                    include: { speakingSession: true },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    const slotDuration = weekly[0]?.slotDuration ?? 20;

    return {
      slotDuration,
      bufferMinutes: 0,
      weekStart: weekStartDate.toISOString(),
      weekly: weekly.map((a) => ({
        dayOfWeek: a.dayOfWeek,
        startTime: a.startTime,
        endTime: a.endTime,
        slotDuration: a.slotDuration,
      })),
      slots: weekSlots.map((s) => {
        const enrollment = s.enrollments[0];
        const studentName = enrollment?.student.user.name ?? null;
        const speakingSessionId =
          enrollment?.examSession?.sectionAttempts[0]?.speakingSession?.id ??
          null;
        return {
          id: s.id,
          startsAt: s.startsAt,
          endsAt: s.endsAt,
          status: s.status.toLowerCase(),
          studentName,
          speakingSessionId,
        };
      }),
      upcoming: upcomingSlots.map((s) => {
        const enrollment = s.enrollments[0];
        const speakingSessionId =
          enrollment?.examSession?.sectionAttempts[0]?.speakingSession?.id ??
          null;
        return {
          id: s.id,
          startsAt: s.startsAt,
          endsAt: s.endsAt,
          studentName: enrollment?.student.user.name ?? 'Student',
          speakingSessionId,
        };
      }),
    };
  }

  async updateAvailability(
    user: RequestUser,
    slots: { dayOfWeek: number; startTime: string; endTime: string }[],
    _slotDuration = SPEAKING_SLOT_DURATION_MINUTES,
  ) {
    const teacher = await this.requireTeacher(user);
    this.assertMarketplaceTeacher(teacher);

    // Speaking sessions are fixed at 20 minutes on :00 / :20 / :40.
    const duration = SPEAKING_SLOT_DURATION_MINUTES;
    const normalized = slots.map((s) => {
      const startTime = ceilSpeakingGridTime(s.startTime.slice(0, 5));
      const endTime = floorSpeakingGridTime(s.endTime.slice(0, 5));
      assertSpeakingGridTime(startTime, 'Availability start');
      assertSpeakingGridTime(endTime, 'Availability end');
      if (minutesFromHhMm(startTime) >= minutesFromHhMm(endTime)) {
        throw new BadRequestException(
          'Each availability range must start before it ends on the 20-minute grid',
        );
      }
      return {
        dayOfWeek: s.dayOfWeek,
        startTime,
        endTime,
      };
    });

    await this.prisma.teacherAvailability.deleteMany({
      where: { teacherId: teacher.id },
    });

    if (normalized.length > 0) {
      await this.prisma.teacherAvailability.createMany({
        data: normalized.map((s) => ({
          teacherId: teacher.id,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          slotDuration: duration,
        })),
      });
    }

    const generated = await this.regenerateSlots(
      teacher.id,
      normalized,
      28,
      duration,
    );

    return { updated: normalized.length, slotsGenerated: generated };
  }

  private getMonday(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  /**
   * Turn the teacher's weekly working-hour templates into concrete bookable
   * slots for the next few weeks. Existing BOOKED/BLOCKED slots are preserved;
   * only stale future AVAILABLE slots are cleared and rebuilt so the booking
   * wizard always reflects the latest working hours.
   */
  private async regenerateSlots(
    teacherId: string,
    weekly: { dayOfWeek: number; startTime: string; endTime: string }[],
    horizonDays = 28,
    _slotDuration = SPEAKING_SLOT_DURATION_MINUTES,
  ): Promise<number> {
    const timeZone = await this.settings.getPlatformTimezone();
    const now = new Date();
    const todayIso = calendarDateIsoInTimeZone(now, timeZone);

    await this.prisma.teacherSlot.deleteMany({
      where: {
        teacherId,
        status: SlotStatus.AVAILABLE,
        startsAt: { gte: now },
      },
    });

    const windowsByDay = new Map<number, { start: string; end: string }[]>();
    for (const w of weekly) {
      const list = windowsByDay.get(w.dayOfWeek) ?? [];
      list.push({ start: w.startTime, end: w.endTime });
      windowsByDay.set(w.dayOfWeek, list);
    }

    const slotMs = SPEAKING_SLOT_DURATION_MINUTES * 60 * 1000;
    const data: {
      teacherId: string;
      startsAt: Date;
      endsAt: Date;
      status: SlotStatus;
    }[] = [];

    for (let offset = 0; offset <= horizonDays; offset += 1) {
      const dateIso =
        offset === 0 ? todayIso : addCalendarDaysIso(todayIso, offset, timeZone);
      const windows = windowsByDay.get(weekdayIndexInTimeZone(dateIso, timeZone));
      if (!windows) continue;

      for (const win of windows) {
        const startAligned = ceilSpeakingGridTime(win.start.slice(0, 5));
        const endAligned = floorSpeakingGridTime(win.end.slice(0, 5));
        let cursorMinutes = minutesFromHhMm(startAligned);
        const endMinutes = minutesFromHhMm(endAligned);

        while (cursorMinutes + SPEAKING_SLOT_DURATION_MINUTES <= endMinutes) {
          const hhMm = hhMmFromMinutes(cursorMinutes);
          const [hour, minute] = hhMm.split(':').map(Number);
          const startsAt = zonedWallClockToUtc(
            dateIso,
            hour!,
            minute!,
            0,
            timeZone,
          );
          const endsAt = new Date(startsAt.getTime() + slotMs);
          if (startsAt.getTime() > now.getTime()) {
            data.push({
              teacherId,
              startsAt,
              endsAt,
              status: SlotStatus.AVAILABLE,
            });
          }
          cursorMinutes += SPEAKING_SLOT_DURATION_MINUTES;
        }
      }
    }

    if (data.length === 0) return 0;

    // skipDuplicates avoids colliding with preserved BOOKED/BLOCKED slots that
    // share the same [teacherId, startsAt] unique key.
    const created = await this.prisma.teacherSlot.createMany({
      data,
      skipDuplicates: true,
    });
    return created.count;
  }

  async blockSlot(user: RequestUser, slotId: string) {
    const teacher = await this.requireTeacher(user);
    this.assertMarketplaceTeacher(teacher);
    const slot = await this.prisma.teacherSlot.findFirst({
      where: { id: slotId, teacherId: teacher.id },
    });
    if (!slot) throw new NotFoundException('Slot not found');
    if (slot.status === SlotStatus.BOOKED) {
      throw new ForbiddenException('Cannot block a booked slot');
    }

    await this.prisma.teacherSlot.update({
      where: { id: slotId },
      data: { status: SlotStatus.BLOCKED },
    });
    return { blocked: true };
  }

  async unblockSlot(user: RequestUser, slotId: string) {
    const teacher = await this.requireTeacher(user);
    this.assertMarketplaceTeacher(teacher);
    const slot = await this.prisma.teacherSlot.findFirst({
      where: { id: slotId, teacherId: teacher.id },
    });
    if (!slot) throw new NotFoundException('Slot not found');
    if (slot.status !== SlotStatus.BLOCKED) {
      throw new ForbiddenException('Only blocked slots can be unblocked');
    }

    await this.prisma.teacherSlot.update({
      where: { id: slotId },
      data: { status: SlotStatus.AVAILABLE },
    });
    return { unblocked: true };
  }

  async getEarnings(user: RequestUser) {
    const teacher = await this.requireTeacher(user);
    const commission = await this.settings.getCommissionRates();
    const rates = await this.settings.resolveTeacherGrossRates(teacher.id);

    const payouts = await this.prisma.payout.findMany({
      where: { teacherId: teacher.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const now = new Date();
    const summary = summarizeTeacherPayouts(
      payouts.map((p) => ({
        id: p.id,
        amount: p.amount,
        status: p.status,
        periodStart: p.periodStart,
        periodEnd: p.periodEnd,
      })),
      commission.payoutSchedule,
      now,
    );

    const weeklyRevenue = await this.buildWeeklyRevenue(
      teacher.id,
      rates.speakingNet,
      rates.writingNet,
    );

    return {
      totalEarned: teacher.totalEarned,
      totalSessions: teacher.totalSessions,
      speakingRate: rates.speakingNet,
      writingRate: rates.writingNet,
      speakingGross: rates.speakingGross,
      writingGross: rates.writingGross,
      platformSharePercent: rates.platformSharePercent,
      lockedBalance: summary.lockedBalance,
      availableBalance: summary.availableBalance,
      processingBalance: summary.processingBalance,
      pendingBalance: summary.availableBalance,
      payoutSchedule: commission.payoutSchedule,
      currentPeriod: {
        start: summary.currentPeriod.start,
        end: summary.currentPeriod.end,
        label: summary.currentPeriod.label,
      },
      nextUnlockAt: summary.nextUnlockAt,
      payoutDetails:
        (teacher.payoutDetails as TeacherPayoutDetails | null) ?? null,
      weeklyRevenue,
      payouts: payouts.map((p) => ({
        id: p.id,
        amount: p.amount,
        currency: p.currency,
        status: p.status.toLowerCase(),
        periodStart: p.periodStart,
        periodEnd: p.periodEnd,
        paidAt: p.paidAt,
        requestable: isPayoutRowRequestable(p.status, p.periodEnd, now),
      })),
    };
  }

  async requestPayout(user: RequestUser) {
    const teacher = await this.requireTeacher(user);
    const details = teacher.payoutDetails as TeacherPayoutDetails | null;

    if (!hasPayoutCardDetails(details)) {
      throw new BadRequestException(
        'Add your payout card details before requesting a payout',
      );
    }

    const now = new Date();
    const pending = await this.prisma.payout.findMany({
      where: {
        teacherId: teacher.id,
        status: PayoutStatus.PENDING,
        periodEnd: { lte: now },
      },
    });

    if (pending.length === 0) {
      throw new BadRequestException(
        'No completed earnings available to request yet',
      );
    }

    const amount = pending.reduce((sum, p) => sum + p.amount, 0);
    const eligibleIds = pending.map((p) => p.id);

    await this.prisma.payout.updateMany({
      where: { id: { in: eligibleIds } },
      data: { status: PayoutStatus.PROCESSING },
    });

    const admins = await this.prisma.user.findMany({
      where: { role: UserRole.ADMIN },
      select: { id: true },
    });
    await Promise.all(
      admins.map((admin) =>
        this.notifications.create(
          admin.id,
          'Payout requested',
          `${user.name} requested ${formatMoney(amount)} in pending earnings.`,
          NotificationType.SYSTEM,
          '/admin/orders',
        ),
      ),
    );

    return { requested: pending.length, amount };
  }

  private async buildWeeklyRevenue(
    teacherId: string,
    speakingRate: number,
    writingRate: number,
  ) {
    const now = new Date();
    const weekStart = new Date(now);
    const mondayOffset = (now.getDay() + 6) % 7;
    weekStart.setDate(now.getDate() - mondayOffset);
    weekStart.setHours(0, 0, 0, 0);

    const grades = await this.prisma.grade.findMany({
      where: {
        gradedById: teacherId,
        gradedAt: { gte: weekStart },
      },
      select: {
        gradedAt: true,
        speakingSessionId: true,
        writingSubmissionId: true,
      },
    });

    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const days = dayLabels.map((day) => ({ day, speaking: 0, writing: 0 }));

    for (const grade of grades) {
      const dayIndex = (grade.gradedAt.getDay() + 6) % 7;
      if (grade.speakingSessionId) {
        days[dayIndex].speaking += speakingRate;
      } else if (grade.writingSubmissionId) {
        days[dayIndex].writing += writingRate;
      }
    }

    return {
      days,
      hasData: grades.length > 0,
    };
  }

  async getProfile(user: RequestUser) {
    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { id: user.teacherProfileId },
      include: { user: true },
    });
    if (!teacher) throw new NotFoundException('Teacher profile not found');

    const sessionActivityMonths = await this.buildSessionActivityMonths(
      teacher.id,
    );

    return {
      name: teacher.user.name,
      email: teacher.user.email,
      bio: teacher.bio,
      avatarUrl: teacher.avatarUrl,
      notificationPrefs: teacher.notificationPrefs,
      credentials: teacher.credentials,
      languages: Array.isArray(teacher.languages)
        ? (teacher.languages as string[])
        : [],
      speciality: teacher.speciality.toLowerCase(),
      rating: teacher.rating,
      reviewCount: teacher.reviewCount,
      totalSessions: teacher.totalSessions,
      totalEarned: teacher.totalEarned,
      status: teacher.status.toLowerCase(),
      memberSince: teacher.user.createdAt,
      emailVerified: teacher.user.emailVerifiedAt != null,
      sessionActivityMonths,
    };
  }

  private async buildSessionActivityMonths(teacherId: string) {
    const now = new Date();
    const buckets: { month: string; count: number; sortKey: string }[] = [];

    for (let offset = 5; offset >= 0; offset -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      buckets.push({
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        count: 0,
        sortKey: `${date.getFullYear()}-${date.getMonth()}`,
      });
    }

    const rangeStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const grades = await this.prisma.grade.findMany({
      where: {
        gradedById: teacherId,
        gradedAt: { gte: rangeStart },
      },
      select: { gradedAt: true },
    });

    for (const grade of grades) {
      const key = `${grade.gradedAt.getFullYear()}-${grade.gradedAt.getMonth()}`;
      const bucket = buckets.find((entry) => entry.sortKey === key);
      if (bucket) bucket.count += 1;
    }

    return buckets.map(({ month, count }) => ({ month, count }));
  }

  async updateProfile(user: RequestUser, dto: UpdateTeacherProfileDto) {
    const teacher = await this.requireTeacher(user);

    await this.prisma.$transaction(async (tx) => {
      if (dto.name !== undefined) {
        await tx.user.update({
          where: { id: teacher.userId },
          data: { name: dto.name },
        });
      }

      const teacherData: {
        bio?: string;
        speciality?: TeacherSpeciality;
        avatarUrl?: string | null;
        notificationPrefs?: Prisma.InputJsonValue;
        payoutDetails?: Prisma.InputJsonValue;
      } = {};
      if (dto.bio !== undefined) teacherData.bio = dto.bio;
      if (dto.speciality !== undefined) {
        if (teacher.institutionId) {
          throw new ForbiddenException(
            'Speciality is managed by your centre',
          );
        }
        teacherData.speciality =
          dto.speciality.toUpperCase() as TeacherSpeciality;
      }
      if (dto.avatarUrl !== undefined) {
        teacherData.avatarUrl = dto.avatarUrl || null;
      }
      if (dto.notificationPrefs !== undefined) {
        teacherData.notificationPrefs = dto.notificationPrefs;
      }
      if (dto.payoutDetails !== undefined) {
        const cardNumber = normalizeCardNumber(dto.payoutDetails.cardNumber);
        if (!isValidCardNumber(cardNumber)) {
          throw new BadRequestException(
            'Invalid card number. Check the number and try again.',
          );
        }
        const cardHolderName = dto.payoutDetails.cardHolderName.trim();
        if (!cardHolderName) {
          throw new BadRequestException('Card holder name is required');
        }
        // Store card fields only — do not persist legacy bank account fields.
        teacherData.payoutDetails = {
          cardHolderName,
          cardNumber,
          method: dto.payoutDetails.method?.trim() || 'Bank card',
        };
      }

      if (Object.keys(teacherData).length > 0) {
        await tx.teacherProfile.update({
          where: { id: teacher.id },
          data: teacherData,
        });
      }
    });

    return this.getProfile(user);
  }

  private async countVisibleWritingQueue(teacherId: string): Promise<number> {
    const submissions = await this.prisma.writingSubmission.findMany({
      where: { teacherId, status: { in: ['PENDING', 'IN_REVIEW'] } },
      select: { status: true, aiEvaluation: { select: { status: true } } },
    });
    return submissions.filter(
      (s) =>
        s.status === 'IN_REVIEW' ||
        isWritingVisibleToTeacher(s.aiEvaluation),
    ).length;
  }

  private async requireTeacher(user: RequestUser) {
    if (!user.teacherProfileId) {
      throw new ForbiddenException('Teacher profile required');
    }
    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { id: user.teacherProfileId },
    });
    if (!teacher) throw new NotFoundException('Teacher not found');
    return teacher;
  }

  /** Centre examiners do not manage marketplace availability — the institution does. */
  private assertMarketplaceTeacher(teacher: { institutionId: string | null }) {
    if (teacher.institutionId) {
      throw new ForbiddenException(
        'Availability is managed by your centre. Contact your centre admin to schedule speaking sessions.',
      );
    }
  }
}
