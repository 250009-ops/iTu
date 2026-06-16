import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  NotificationType,
  Prisma,
  TicketType,
  UserRole,
} from '@prisma/client';
import { RequestUser } from '../../common/types/request-user';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

const TICKET_TYPE_MAP: Record<
  NonNullable<CreateSupportTicketDto['type']>,
  TicketType
> = {
  regrade_request: TicketType.REGRADE_REQUEST,
  teacher_no_show: TicketType.TEACHER_NO_SHOW,
  technical_issue: TicketType.TECHNICAL_ISSUE,
  payment_dispute: TicketType.PAYMENT_DISPUTE,
};

@Injectable()
export class StudentsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async getDashboard(user: RequestUser) {
    this.requireStudent(user);

    const profile = await this.prisma.studentProfile.findUnique({
      where: { id: user.studentProfileId },
      include: { user: true },
    });

    const enrollments = await this.prisma.enrollment.findMany({
      where: { studentId: user.studentProfileId },
      include: {
        package: true,
        examSession: { include: { sectionAttempts: true } },
        writingTeacher: { include: { user: true } },
        speakingTeacher: { include: { user: true } },
      },
      orderBy: { mockDate: 'desc' },
    });

    const upcoming = enrollments.find(
      (e) =>
        e.status === 'ENROLLED' ||
        e.status === 'IN_PROGRESS' ||
        e.status === 'AWAITING_RESULTS',
    );

    const completed = enrollments.filter((e) => e.status === 'COMPLETED');

    const overallBands = completed.map((e) => {
      const attempts = e.examSession?.sectionAttempts ?? [];
      const bands = attempts
        .map((a) => a.band)
        .filter((b): b is number => b !== null);
      if (!bands.length) return null;
      return Math.round((bands.reduce((a, b) => a + b, 0) / bands.length) * 2) / 2;
    }).filter((b): b is number => b !== null);

    const currentBestBand =
      overallBands.length > 0 ? Math.max(...overallBands) : null;
    const previousBest =
      overallBands.length > 1
        ? overallBands.slice(1).reduce((max, b) => Math.max(max, b), 0)
        : null;
    const bandImprovement =
      currentBestBand != null && previousBest != null
        ? Math.round((currentBestBand - previousBest) * 2) / 2
        : 0;

    const notifications = await this.prisma.notification.findMany({
      where: { userId: user.id },
      take: 10,
      orderBy: { createdAt: 'desc' },
    });

    const releasedAwaiting = enrollments.find(
      (e) => e.resultsStatus === 'RELEASED' && e.status === 'COMPLETED',
    );

    const now = new Date();
    const upcomingDate = upcoming?.mockDate ?? null;
    let daysUntil = 0;
    let hoursUntil = 0;
    let minutesUntil = 0;
    if (upcomingDate) {
      const diff = Math.max(0, upcomingDate.getTime() - now.getTime());
      daysUntil = Math.floor(diff / (24 * 60 * 60 * 1000));
      hoursUntil = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
      minutesUntil = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
    }

    const completedSkills =
      upcoming?.examSession?.sectionAttempts
        .filter((a) => a.submittedAt)
        .map((a) => a.skill.toLowerCase()) ?? [];

    return {
      user: {
        name: profile?.user.name ?? user.name,
        targetBand: profile?.targetBand,
        examType: profile?.examType.toLowerCase() ?? 'academic',
        mocksCompleted: completed.length,
      },
      stats: {
        mocksCompleted: completed.length,
        currentBestBand,
        bandImprovement,
        targetBand: profile?.targetBand,
        targetAchieved:
          currentBestBand != null &&
          profile?.targetBand != null &&
          currentBestBand >= profile.targetBand,
        upcomingMocks: upcoming ? 1 : 0,
        unreadNotifications: notifications.filter((n) => !n.isRead).length,
      },
      resultsAlert: releasedAwaiting
        ? {
            title: 'Your mock results are ready!',
            message: `Full band report for ${releasedAwaiting.enrollmentCode} is available.`,
            href: '/student/results',
          }
        : null,
      upcomingMock: upcoming
        ? {
            enrollmentCode: upcoming.enrollmentCode,
            mockDate: upcoming.mockDate,
            mockTime: upcoming.mockTime,
            package: upcoming.package.title,
            sessionCode: upcoming.examSession?.sessionCode,
            status: upcoming.status.toLowerCase(),
            writingExaminer: upcoming.writingTeacher?.user.name,
            speakingExaminer: upcoming.speakingTeacher?.user.name,
            daysUntil,
            hoursUntil,
            minutesUntil,
            skills: ['listening', 'reading', 'writing', 'speaking'].map(
              (skill) => ({
                name: skill.charAt(0).toUpperCase() + skill.slice(1),
                status: completedSkills.includes(skill)
                  ? 'completed'
                  : upcoming.examSession?.state
                        .toLowerCase()
                        .includes(skill)
                    ? 'active'
                    : 'scheduled',
              }),
            ),
          }
        : null,
      bandProgress: completed
        .slice()
        .reverse()
        .map((e) => {
          const attempts = e.examSession?.sectionAttempts ?? [];
          const bands = attempts
            .map((a) => a.band)
            .filter((b): b is number => b !== null);
          const overall =
            bands.length > 0
              ? Math.round((bands.reduce((a, b) => a + b, 0) / bands.length) * 2) / 2
              : null;
          return {
            month: e.mockDate.toLocaleString('en-US', { month: 'short' }),
            band: overall,
          };
        })
        .filter((p) => p.band != null),
      pastMocks: completed.slice(0, 5).map((e) => {
        const bySkill = Object.fromEntries(
          (e.examSession?.sectionAttempts ?? []).map((a) => [
            a.skill.toLowerCase(),
            a.band,
          ]),
        );
        const bands = Object.values(bySkill).filter(
          (b): b is number => b != null,
        );
        const overall =
          bands.length > 0
            ? Math.round((bands.reduce((a, b) => a + b, 0) / bands.length) * 2) / 2
            : null;
        return {
          id: e.id,
          enrollmentCode: e.enrollmentCode,
          mockDate: e.mockDate,
          package: e.package.title,
          listening: bySkill.listening ?? null,
          reading: bySkill.reading ?? null,
          writing: bySkill.writing ?? null,
          speaking: bySkill.speaking ?? null,
          overall,
          status: e.status.toLowerCase(),
        };
      }),
      activities: notifications.slice(0, 5).map((n) => ({
        id: n.id,
        type: n.type.toLowerCase(),
        title: n.title,
        detail: n.body,
        time: n.createdAt,
        isRead: n.isRead,
      })),
    };
  }

  async getMockDayHub(user: RequestUser) {
    this.requireStudent(user);

    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        studentId: user.studentProfileId,
        status: { in: ['ENROLLED', 'IN_PROGRESS'] },
      },
      include: {
        package: true,
        examSession: { include: { sectionAttempts: true } },
        speakingSlot: true,
        speakingTeacher: { include: { user: true } },
      },
      orderBy: { mockDate: 'asc' },
    });

    if (!enrollment?.examSession) {
      return { enrollment: null };
    }

    const session = enrollment.examSession;
    const completedSkills = session.sectionAttempts
      .filter((a) => a.submittedAt)
      .map((a) => a.skill.toLowerCase());

    return {
      enrollment: {
        id: enrollment.id,
        enrollmentCode: enrollment.enrollmentCode,
        mockDate: enrollment.mockDate,
        mockTime: enrollment.mockTime,
        sessionCode: session.sessionCode,
        state: session.state.toLowerCase(),
      },
      sections: ['listening', 'reading', 'writing', 'speaking'].map((skill) => ({
        skill,
        completed: completedSkills.includes(skill),
        active: session.state.toLowerCase().includes(skill) && !completedSkills.includes(skill),
      })),
      speaking: {
        scheduledAt: enrollment.speakingSlot?.startsAt,
        examiner: enrollment.speakingTeacher?.user.name,
      },
    };
  }

  async getProfile(user: RequestUser) {
    this.requireStudent(user);

    const profile = await this.prisma.studentProfile.findUnique({
      where: { id: user.studentProfileId },
      include: {
        user: true,
        enrollments: {
          include: {
            examSession: { include: { sectionAttempts: true } },
            package: true,
          },
          orderBy: { mockDate: 'desc' },
        },
        orders: {
          include: { package: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!profile) return null;

    const latestOrder = profile.orders.find((o) => o.status === 'PAID') ?? null;
    const completedCount = profile.enrollments.filter(
      (e) => e.status === 'COMPLETED',
    ).length;

    return {
      name: profile.user.name,
      email: profile.user.email,
      phone: profile.phone,
      targetBand: profile.targetBand,
      examType: profile.examType.toLowerCase(),
      country: profile.country,
      publishToLeaderboard: profile.publishToLeaderboard,
      notificationPrefs: profile.notificationPrefs as
        | Record<string, boolean>
        | null,
      package: {
        title: latestOrder?.package.title ?? null,
        purchasedAt: latestOrder?.createdAt ?? null,
        amount: latestOrder?.amount ?? null,
        currency: latestOrder?.currency ?? null,
        orderCode: latestOrder?.orderCode ?? null,
        skills: latestOrder?.package.skills ?? [],
        mocksUsed: completedCount,
        mocksTotal: profile.enrollments.length,
      },
      scoreHistory: profile.enrollments
        .filter((e) => e.status === 'COMPLETED')
        .map((e) => ({
          date: e.mockDate,
          package: e.package.title,
          bands: e.examSession?.sectionAttempts.map((a) => ({
            skill: a.skill.toLowerCase(),
            band: a.band,
          })),
        })),
    };
  }

  async updateProfile(user: RequestUser, dto: UpdateProfileDto) {
    this.requireStudent(user);

    const profile = await this.prisma.studentProfile.findUnique({
      where: { id: user.studentProfileId },
    });
    if (!profile) throw new NotFoundException('Student profile not found');

    await this.prisma.$transaction(async (tx) => {
      if (dto.name !== undefined) {
        await tx.user.update({
          where: { id: profile.userId },
          data: { name: dto.name.trim() },
        });
      }

      const profileData: {
        phone?: string;
        country?: string;
        targetBand?: number;
        examType?: 'ACADEMIC' | 'GENERAL_TRAINING';
        notificationPrefs?: Prisma.InputJsonValue;
      } = {};
      if (dto.phone !== undefined) profileData.phone = dto.phone.trim();
      if (dto.country !== undefined) profileData.country = dto.country.trim();
      if (dto.targetBand !== undefined) profileData.targetBand = dto.targetBand;
      if (dto.examType !== undefined) {
        profileData.examType =
          dto.examType === 'general_training' ? 'GENERAL_TRAINING' : 'ACADEMIC';
      }
      if (dto.notificationPrefs !== undefined) {
        profileData.notificationPrefs = dto.notificationPrefs;
      }

      if (Object.keys(profileData).length > 0) {
        await tx.studentProfile.update({
          where: { id: profile.id },
          data: profileData,
        });
      }
    });

    return this.getProfile(user);
  }

  /** Completed enrollments eligible for (or already carrying) a review. */
  async getReviewables(user: RequestUser) {
    this.requireStudent(user);

    const enrollments = await this.prisma.enrollment.findMany({
      where: { studentId: user.studentProfileId, status: 'COMPLETED' },
      include: {
        package: { select: { title: true } },
        writingTeacher: { include: { user: { select: { name: true } } } },
        speakingTeacher: { include: { user: { select: { name: true } } } },
        review: true,
      },
      orderBy: { mockDate: 'desc' },
    });

    return enrollments.map((e) => ({
      enrollmentId: e.id,
      enrollmentCode: e.enrollmentCode,
      package: e.package.title,
      mockDate: e.mockDate,
      writingExaminer: e.writingTeacher?.user.name ?? null,
      speakingExaminer: e.speakingTeacher?.user.name ?? null,
      review: e.review
        ? {
            rating: e.review.rating,
            comment: e.review.comment,
            publishConsent: e.review.publishConsent,
          }
        : null,
    }));
  }

  async submitReview(user: RequestUser, dto: CreateReviewDto) {
    this.requireStudent(user);

    const enrollment = await this.prisma.enrollment.findFirst({
      where: { id: dto.enrollmentId, studentId: user.studentProfileId },
      include: { review: true },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    if (enrollment.status !== 'COMPLETED') {
      throw new BadRequestException('You can only review a completed mock');
    }
    if (enrollment.review) {
      throw new BadRequestException('This mock has already been reviewed');
    }

    const teacherId =
      enrollment.speakingTeacherId ?? enrollment.writingTeacherId ?? null;

    const review = await this.prisma.review.create({
      data: {
        enrollmentId: enrollment.id,
        studentId: user.studentProfileId!,
        packageId: enrollment.packageId,
        teacherId,
        rating: dto.rating,
        comment: dto.comment?.trim() || null,
        publishConsent: dto.publishConsent ?? false,
      },
    });

    await this.recomputePackageRating(enrollment.packageId);
    if (teacherId) await this.recomputeTeacherRating(teacherId);

    return { id: review.id, submitted: true };
  }

  async setLeaderboardConsent(user: RequestUser, publish: boolean) {
    this.requireStudent(user);
    await this.prisma.studentProfile.update({
      where: { id: user.studentProfileId },
      data: { publishToLeaderboard: publish },
    });
    return { publishToLeaderboard: publish };
  }

  private async recomputeTeacherRating(teacherId: string) {
    const agg = await this.prisma.review.aggregate({
      where: { teacherId },
      _avg: { rating: true },
      _count: true,
    });
    await this.prisma.teacherProfile.update({
      where: { id: teacherId },
      data: {
        rating: agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : null,
        reviewCount: agg._count,
      },
    });
  }

  private async recomputePackageRating(packageId: string) {
    const agg = await this.prisma.review.aggregate({
      where: { packageId },
      _avg: { rating: true },
      _count: true,
    });
    await this.prisma.mockTestPackage.update({
      where: { id: packageId },
      data: {
        rating: agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : null,
        reviewCount: agg._count,
      },
    });
  }

  async createSupportTicket(
    user: RequestUser,
    dto: CreateSupportTicketDto,
  ) {
    this.requireStudent(user);

    if (dto.enrollmentId) {
      const enrollment = await this.prisma.enrollment.findFirst({
        where: { id: dto.enrollmentId, studentId: user.studentProfileId },
      });
      if (!enrollment) {
        throw new NotFoundException('Enrollment not found');
      }
    }

    const ticketCode = `TKT-${Math.floor(1000 + Math.random() * 9000)}`;
    const ticketType =
      TICKET_TYPE_MAP[dto.type ?? 'technical_issue'] ??
      TicketType.TECHNICAL_ISSUE;

    const ticket = await this.prisma.supportTicket.create({
      data: {
        ticketCode,
        subject: dto.subject,
        description: dto.message,
        type: ticketType,
        userId: user.id,
        enrollmentId: dto.enrollmentId,
        slaProgress: 0,
        slaState: 'ON_TRACK',
      },
    });

    await this.notifications.create(
      user.id,
      'Support request received',
      `We received your request (${ticket.ticketCode}). Our team will respond shortly.`,
      NotificationType.INFO,
      '/student/help',
    );

    const admins = await this.prisma.user.findMany({
      where: { role: UserRole.ADMIN },
      select: { id: true },
    });
    await Promise.all(
      admins.map((admin) =>
        this.notifications.create(
          admin.id,
          'New support ticket',
          `${ticket.ticketCode}: ${dto.subject}`,
          NotificationType.SYSTEM,
          '/admin/disputes',
        ),
      ),
    );

    return {
      id: ticket.id,
      ticketId: ticket.ticketCode,
      status: ticket.status.toLowerCase(),
    };
  }

  async exportPersonalData(user: RequestUser) {
    this.requireStudent(user);
    const studentId = user.studentProfileId!;

    const profile = await this.prisma.studentProfile.findUnique({
      where: { id: studentId },
      include: { user: true },
    });

    if (!profile) {
      throw new NotFoundException('Student profile not found');
    }

    const [enrollments, orders, notifications, tickets] = await Promise.all([
      this.prisma.enrollment.findMany({
        where: { studentId },
        include: {
          package: true,
          examSession: {
            include: {
              sectionAttempts: {
                include: {
                  writingSubmission: { include: { grade: true } },
                  speakingSession: { include: { grade: true } },
                },
              },
            },
          },
          writingTeacher: { include: { user: { select: { name: true } } } },
          speakingTeacher: { include: { user: { select: { name: true } } } },
        },
        orderBy: { mockDate: 'desc' },
      }),
      this.prisma.order.findMany({
        where: { studentId },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.supportTicket.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      account: {
        email: profile.user.email,
        name: profile.user.name,
        createdAt: profile.user.createdAt,
        totpEnabled: profile.user.totpEnabled,
      },
      profile: {
        targetBand: profile.targetBand,
        examType: profile.examType,
        country: profile.country,
        phone: profile.phone,
        publishToLeaderboard: profile.publishToLeaderboard,
        notificationPrefs: profile.notificationPrefs,
        createdAt: profile.createdAt,
      },
      enrollments: enrollments.map((e) => ({
        enrollmentCode: e.enrollmentCode,
        package: e.package.title,
        mockDate: e.mockDate,
        mockTime: e.mockTime,
        status: e.status,
        resultsStatus: e.resultsStatus,
        writingTeacher: e.writingTeacher?.user.name ?? null,
        speakingTeacher: e.speakingTeacher?.user.name ?? null,
        sections:
          e.examSession?.sectionAttempts.map((a) => ({
            skill: a.skill,
            band: a.band,
            rawScore: a.rawScore,
            startedAt: a.startedAt,
            submittedAt: a.submittedAt,
          })) ?? [],
      })),
      orders: orders.map((o) => ({
        orderCode: o.orderCode,
        amount: o.amount,
        status: o.status,
        paymentMethod: o.paymentMethod,
        createdAt: o.createdAt,
      })),
      notifications: notifications.map((n) => ({
        title: n.title,
        body: n.body,
        type: n.type,
        read: n.isRead,
        createdAt: n.createdAt,
      })),
      supportTickets: tickets.map((t) => ({
        ticketCode: t.ticketCode,
        subject: t.subject,
        type: t.type,
        status: t.status,
        createdAt: t.createdAt,
      })),
    };
  }

  private requireStudent(user: RequestUser) {
    if (!user.studentProfileId) {
      throw new ForbiddenException('Student profile required');
    }
  }
}
