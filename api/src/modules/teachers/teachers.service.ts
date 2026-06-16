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
} from '@prisma/client';
import { RequestUser } from '../../common/types/request-user';
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

    return {
      stats: {
        sessionsToday: speakingToday.length,
        writingQueue,
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

  async getAvailability(user: RequestUser) {
    const teacher = await this.requireTeacher(user);

    const [weekly, slots] = await Promise.all([
      this.prisma.teacherAvailability.findMany({
        where: { teacherId: teacher.id },
        orderBy: { dayOfWeek: 'asc' },
      }),
      this.prisma.teacherSlot.findMany({
        where: {
          teacherId: teacher.id,
          startsAt: { gte: new Date() },
        },
        orderBy: { startsAt: 'asc' },
        take: 50,
      }),
    ]);

    return {
      weekly: weekly.map((a) => ({
        dayOfWeek: a.dayOfWeek,
        startTime: a.startTime,
        endTime: a.endTime,
        slotDuration: a.slotDuration,
      })),
      slots: slots.map((s) => ({
        id: s.id,
        startsAt: s.startsAt,
        endsAt: s.endsAt,
        status: s.status.toLowerCase(),
      })),
    };
  }

  async updateAvailability(
    user: RequestUser,
    slots: { dayOfWeek: number; startTime: string; endTime: string }[],
  ) {
    const teacher = await this.requireTeacher(user);

    await this.prisma.teacherAvailability.deleteMany({
      where: { teacherId: teacher.id },
    });

    await this.prisma.teacherAvailability.createMany({
      data: slots.map((s) => ({
        teacherId: teacher.id,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
      })),
    });

    return { updated: slots.length };
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
