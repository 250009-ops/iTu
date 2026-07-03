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
import { RequestUser } from '../../common/types/request-user';
import {
  addCalendarDaysIso,
  calendarDateIsoInTimeZone,
  weekdayIndexInTimeZone,
  zonedWallClockToUtc,
} from '../../common/mock-day-policy';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SettingsService } from '../settings/settings.service';
import { UpdateTeacherProfileDto } from './dto/update-teacher-profile.dto';

type PayoutDetails = {
  bankName?: string;
  accountName?: string;
  accountLast4?: string;
  method?: string;
};

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

    const writingQueue = await this.prisma.writingSubmission.count({
      where: { teacherId: teacher.id, status: { in: ['PENDING', 'IN_REVIEW'] } },
    });

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
    const writing = await this.prisma.writingSubmission.count({
      where: { teacherId: teacher.id, status: { in: ['PENDING', 'IN_REVIEW'] } },
    });
    const speaking = await this.prisma.speakingSession.count({
      where: {
        teacherId: teacher.id,
        status: 'COMPLETED',
        grade: null,
      },
    });
    return { speaking, writing };
  }

  async getSpeakingSessions(user: RequestUser) {
    const teacher = await this.requireTeacher(user);
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

      let uiStatus: 'upcoming' | 'live' | 'awaiting_grade' | 'graded';
      if (s.grade) {
        uiStatus = 'graded';
      } else if (s.status === 'COMPLETED') {
        uiStatus = 'awaiting_grade';
      } else if (s.status === 'ACTIVE' || s.status === 'WAITING') {
        uiStatus = 'live';
      } else {
        uiStatus = 'upcoming';
      }

      return {
        id: s.id,
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

    const actionable = mapped.filter(
      (s) =>
        s.uiStatus === 'upcoming' ||
        s.uiStatus === 'live' ||
        s.uiStatus === 'awaiting_grade',
    );
    const nextSession =
      actionable.find((s) => s.scheduledAt && new Date(s.scheduledAt) >= now) ??
      actionable.find((s) => s.uiStatus === 'live') ??
      null;

    let minutesUntilNext: number | null = null;
    if (nextSession?.scheduledAt) {
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
      completed,
      counts: {
        today: todaySessions.length,
        upcoming: upcoming.length,
        completed: completed.length,
      },
      nextSession,
      minutesUntilNext,
    };
  }

  async getAvailability(user: RequestUser, weekStart?: string) {
    const teacher = await this.requireTeacher(user);

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
        const studentName = s.enrollments[0]?.student.user.name ?? null;
        return {
          id: s.id,
          startsAt: s.startsAt,
          endsAt: s.endsAt,
          status: s.status.toLowerCase(),
          studentName,
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
    slotDuration = 20,
  ) {
    const teacher = await this.requireTeacher(user);

    const duration = [15, 20, 30].includes(slotDuration) ? slotDuration : 20;

    await this.prisma.teacherAvailability.deleteMany({
      where: { teacherId: teacher.id },
    });

    if (slots.length > 0) {
      await this.prisma.teacherAvailability.createMany({
        data: slots.map((s) => ({
          teacherId: teacher.id,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          slotDuration: duration,
        })),
      });
    }

    const generated = await this.regenerateSlots(teacher.id, slots, 28, duration);

    return { updated: slots.length, slotsGenerated: generated };
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
    slotDuration = 20,
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

    const slotMs = slotDuration * 60 * 1000;
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
        const [startHour, startMin] = win.start.split(':').map(Number);
        const [endHour, endMin] = win.end.split(':').map(Number);
        if (
          [startHour, startMin, endHour, endMin].some((v) => Number.isNaN(v))
        ) {
          continue;
        }

        const windowStart = zonedWallClockToUtc(
          dateIso,
          startHour,
          startMin,
          0,
          timeZone,
        );
        const windowEnd = zonedWallClockToUtc(
          dateIso,
          endHour,
          endMin,
          0,
          timeZone,
        );

        let cursor = windowStart.getTime();
        while (cursor + slotMs <= windowEnd.getTime()) {
          const startsAt = new Date(cursor);
          const endsAt = new Date(cursor + slotMs);
          if (startsAt.getTime() > now.getTime()) {
            data.push({
              teacherId,
              startsAt,
              endsAt,
              status: SlotStatus.AVAILABLE,
            });
          }
          cursor += slotMs;
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

    const payouts = await this.prisma.payout.findMany({
      where: { teacherId: teacher.id },
      orderBy: { createdAt: 'desc' },
      take: 12,
    });

    return {
      totalEarned: teacher.totalEarned,
      commissionRate: teacher.commissionRate,
      payoutSchedule: commission.payoutSchedule,
      payoutDetails: (teacher.payoutDetails as PayoutDetails | null) ?? null,
      payouts: payouts.map((p) => ({
        id: p.id,
        amount: p.amount,
        currency: p.currency,
        status: p.status.toLowerCase(),
        periodStart: p.periodStart,
        periodEnd: p.periodEnd,
        paidAt: p.paidAt,
      })),
    };
  }

  async requestPayout(user: RequestUser) {
    const teacher = await this.requireTeacher(user);
    const details = teacher.payoutDetails as PayoutDetails | null;

    if (!details?.accountLast4?.trim()) {
      throw new BadRequestException(
        'Add your payout bank details before requesting a payout',
      );
    }

    const pending = await this.prisma.payout.findMany({
      where: { teacherId: teacher.id, status: PayoutStatus.PENDING },
    });

    if (pending.length === 0) {
      throw new BadRequestException('No pending balance available to request');
    }

    const amount = pending.reduce((sum, p) => sum + p.amount, 0);

    await this.prisma.payout.updateMany({
      where: { teacherId: teacher.id, status: PayoutStatus.PENDING },
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
          `${user.name} requested $${amount.toFixed(2)} in pending earnings.`,
          NotificationType.SYSTEM,
          '/admin/orders',
        ),
      ),
    );

    return { requested: pending.length, amount };
  }

  async getProfile(user: RequestUser) {
    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { id: user.teacherProfileId },
      include: { user: true },
    });
    if (!teacher) throw new NotFoundException('Teacher profile not found');

    return {
      name: teacher.user.name,
      email: teacher.user.email,
      bio: teacher.bio,
      avatarUrl: teacher.avatarUrl,
      notificationPrefs: teacher.notificationPrefs,
      credentials: teacher.credentials,
      speciality: teacher.speciality.toLowerCase(),
      rating: teacher.rating,
      totalSessions: teacher.totalSessions,
      totalEarned: teacher.totalEarned,
      status: teacher.status.toLowerCase(),
    };
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
        teacherData.payoutDetails = dto.payoutDetails;
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
}
