import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ExamSkill,
  NotificationType,
  Prisma,
  TicketPriority,
  TicketType,
  UserRole,
} from '@prisma/client';
import { RequestUser } from '../../common/types/request-user';
import {
  countdownParts,
  mockStartDateTime,
  overallBandFromSkillBands,
  resolveAttemptBand,
} from '../../common/band-resolution';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CatalogService } from '../catalog/catalog.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { packageExamSkills } from '../content/package-skills';
import { selectMockDayEnrollment } from './mock-day-enrollment';
import { EnrollmentLifecycleService } from '../bookings/enrollment-lifecycle.service';

const TICKET_TYPE_MAP: Record<
  NonNullable<CreateSupportTicketDto['type']>,
  TicketType
> = {
  regrade_request: TicketType.REGRADE_REQUEST,
  teacher_no_show: TicketType.TEACHER_NO_SHOW,
  technical_issue: TicketType.TECHNICAL_ISSUE,
  payment_dispute: TicketType.PAYMENT_DISPUTE,
  student_conduct: TicketType.STUDENT_CONDUCT,
};

const DEFAULT_TICKET_PRIORITY: Record<TicketType, TicketPriority> = {
  REGRADE_REQUEST: TicketPriority.MEDIUM,
  TEACHER_NO_SHOW: TicketPriority.HIGH,
  TECHNICAL_ISSUE: TicketPriority.MEDIUM,
  PAYMENT_DISPUTE: TicketPriority.HIGH,
  STUDENT_CONDUCT: TicketPriority.HIGH,
};

@Injectable()
export class StudentsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private catalog: CatalogService,
    private enrollmentLifecycle: EnrollmentLifecycleService,
  ) {}

  async listCatalogPackages(user: RequestUser) {
    this.requireStudent(user);
    return this.catalog.listPackagesForStudent(user.studentProfileId!);
  }

  async listCatalogOffers(user: RequestUser) {
    this.requireStudent(user);
    return this.catalog.listOffersForStudent(user.studentProfileId!);
  }

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

    for (const enrollment of enrollments) {
      if (
        enrollment.status === 'ENROLLED' ||
        enrollment.status === 'IN_PROGRESS'
      ) {
        await this.enrollmentLifecycle.markMissedIfEligible(enrollment.id);
        await this.enrollmentLifecycle.markSpeakingNoShowIfEligible(
          enrollment.id,
        );
      }
    }

    const refreshed = await this.prisma.enrollment.findMany({
      where: { studentId: user.studentProfileId },
      include: {
        package: true,
        examSession: { include: { sectionAttempts: true } },
        writingTeacher: { include: { user: true } },
        speakingTeacher: { include: { user: true } },
      },
      orderBy: { mockDate: 'desc' },
    });

    const upcoming = refreshed.find(
      (e) =>
        e.status === 'ENROLLED' ||
        e.status === 'IN_PROGRESS' ||
        e.status === 'AWAITING_RESULTS',
    );

    const missed = !upcoming
      ? refreshed.find((e) => e.status === 'MISSED')
      : null;

    const completed = refreshed.filter((e) => e.status === 'COMPLETED');

    const resolvedCompleted = await Promise.all(
      completed.map(async (e) => ({
        enrollment: e,
        scores: await this.resolveEnrollmentBands(e),
      })),
    );

    const overallBands = resolvedCompleted
      .map((row) => row.scores.overall)
      .filter((b): b is number => b != null);

    const currentBestBand =
      overallBands.length > 0 ? Math.max(...overallBands) : null;
    const latestOverall = resolvedCompleted[0]?.scores.overall ?? null;
    const previousOverall = resolvedCompleted[1]?.scores.overall ?? null;
    const bandImprovement =
      latestOverall != null && previousOverall != null
        ? Math.round((latestOverall - previousOverall) * 2) / 2
        : 0;

    const notifications = await this.prisma.notification.findMany({
      where: { userId: user.id },
      take: 20,
      orderBy: { createdAt: 'desc' },
    });

    const unreadResultNotification = notifications.find(
      (n) => !n.isRead && n.type === NotificationType.RESULT,
    );

    const now = new Date();
    let daysUntil = 0;
    let hoursUntil = 0;
    let minutesUntil = 0;
    let mockStarted = false;
    if (upcoming) {
      const start =
        upcoming.mockTime != null
          ? mockStartDateTime(upcoming.mockDate, upcoming.mockTime)
          : upcoming.mockDayCutoffAt ?? upcoming.mockDate;
      const countdown = countdownParts(start, now);
      daysUntil = countdown.daysUntil;
      hoursUntil = countdown.hoursUntil;
      minutesUntil = countdown.minutesUntil;
      mockStarted = countdown.started;
    }

    const completedSkills =
      upcoming?.examSession?.sectionAttempts
        .filter((a) => {
          if (a.submittedAt) return true;
          return false;
        })
        .map((a) => a.skill.toLowerCase()) ?? [];

    const upcomingPackageSkills = upcoming
      ? packageExamSkills(upcoming.package.skills)
      : [];

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
      resultsAlert: unreadResultNotification
        ? {
            title: unreadResultNotification.title,
            message: unreadResultNotification.body,
            href: unreadResultNotification.link ?? '/student/results',
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
            mockStarted,
            hasPastResults: resolvedCompleted.length > 0,
            skills: upcomingPackageSkills.map((skill) => {
              const key = skill.toLowerCase();
              return {
                name: key.charAt(0).toUpperCase() + key.slice(1),
                status: completedSkills.includes(key)
                  ? 'completed'
                  : upcoming.examSession?.state
                        .toLowerCase()
                        .includes(key)
                    ? 'active'
                    : 'scheduled',
              };
            }),
            packageSkills: upcomingPackageSkills.map((s) => s.toLowerCase()),
          }
        : null,
      missedMock: missed
        ? {
            enrollmentCode: missed.enrollmentCode,
            packageTitle: missed.package.title,
            mockDate: missed.mockDate,
            adminGranted: missed.adminGranted,
            reason: missed.examStartedAt ? 'speaking_no_show' : 'never_started',
          }
        : null,
      bandProgress: resolvedCompleted
        .slice()
        .reverse()
        .map(({ enrollment: e, scores }) => ({
          month: e.mockDate.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
          }),
          band: scores.overall,
          listening: scores.bySkill.listening ?? null,
          reading: scores.bySkill.reading ?? null,
          writing: scores.bySkill.writing ?? null,
          speaking: scores.bySkill.speaking ?? null,
        }))
        .filter((p) => p.band != null),
      pastMocks: resolvedCompleted.slice(0, 5).map(({ enrollment: e, scores }) => ({
        id: e.id,
        enrollmentCode: e.enrollmentCode,
        mockDate: e.mockDate,
        package: e.package.title,
        packageSkills: scores.packageSkills,
        listening: scores.bySkill.listening ?? null,
        reading: scores.bySkill.reading ?? null,
        writing: scores.bySkill.writing ?? null,
        speaking: scores.bySkill.speaking ?? null,
        overall: scores.overall,
        status: e.status.toLowerCase(),
      })),
      activities: this.dedupeActivities(notifications).slice(0, 5).map((n) => ({
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

    const mockDayEnrollmentInclude = {
      package: true,
      examSession: {
        include: {
          sectionAttempts: {
            include: { speakingSession: { include: { grade: true } } },
          },
        },
      },
      speakingSlot: true,
      speakingTeacher: { include: { user: true } },
      writingTeacher: { include: { user: true } },
    } as const;

    const activeEnrollments = await this.prisma.enrollment.findMany({
      where: {
        studentId: user.studentProfileId,
        status: { in: ['ENROLLED', 'IN_PROGRESS'] },
      },
      include: mockDayEnrollmentInclude,
    });

    for (const candidate of activeEnrollments) {
      if (candidate.examSession) {
        await this.enrollmentLifecycle.markMissedIfEligible(candidate.id);
        await this.enrollmentLifecycle.markSpeakingNoShowIfEligible(candidate.id);
      }
    }

    const refreshed = await this.prisma.enrollment.findMany({
      where: {
        studentId: user.studentProfileId,
        status: { in: ['ENROLLED', 'IN_PROGRESS'] },
      },
      include: mockDayEnrollmentInclude,
    });

    let enrollment = selectMockDayEnrollment(refreshed);

    if (!enrollment?.examSession) {
      const missedEnrollment = await this.prisma.enrollment.findFirst({
        where: {
          studentId: user.studentProfileId,
          status: 'MISSED',
        },
        include: mockDayEnrollmentInclude,
        orderBy: { missedAt: 'desc' },
      });
      if (missedEnrollment?.examSession) {
        enrollment = missedEnrollment;
      }
    }

    if (!enrollment?.examSession) {
      return { enrollment: null };
    }

    const session = enrollment.examSession;
    const isMissed = enrollment.status === 'MISSED';
    const completedSkills = session.sectionAttempts
      .filter((a) => {
        if (a.submittedAt) return true;
        // Speaking is "over" for the student once the live session has ended or
        // been graded, even if the attempt's submittedAt wasn't stamped.
        const speaking = a.speakingSession;
        return Boolean(
          speaking &&
            (speaking.status === 'COMPLETED' ||
              speaking.status === 'NO_SHOW' ||
              speaking.grade),
        );
      })
      .map((a) => a.skill.toLowerCase());

    const packageSkills = packageExamSkills(enrollment.package.skills);
    const checkInCompleted = Boolean(session.checkInAt);
    const sessionState = session.state.toLowerCase();

    let nextSkill: string | null = null;
    for (const skill of packageSkills) {
      const key = skill.toLowerCase();
      if (!completedSkills.includes(key)) {
        nextSkill = key;
        break;
      }
    }

    return {
      enrollment: {
        id: enrollment.id,
        enrollmentCode: enrollment.enrollmentCode,
        mockDate: enrollment.mockDate,
        mockTime: enrollment.mockTime,
        mockDayCutoffAt: enrollment.mockDayCutoffAt,
        adminGranted: enrollment.adminGranted,
        examStartedAt: enrollment.examStartedAt,
        speakingTeacherId: enrollment.speakingTeacherId,
        speakingSlotId: enrollment.speakingSlotId,
        sessionCode: session.sessionCode,
        state: sessionState,
        status: enrollment.status.toLowerCase(),
        packageTitle: enrollment.package.title,
        packageSkills: packageSkills.map((s) => s.toLowerCase()),
        checkInCompleted,
      },
      sections: packageSkills.map((skill) => {
        const key = skill.toLowerCase();
        const attempt = session.sectionAttempts.find((a) => a.skill === skill);
        const completed = completedSkills.includes(key);
        const active =
          !isMissed && sessionState.includes(key) && !completed;
        const unlocked =
          !isMissed &&
          !completed &&
          !active &&
          checkInCompleted &&
          nextSkill === key;
        return {
          skill: key,
          completed,
          active,
          unlocked,
          band: attempt?.band ?? null,
          rawScore: attempt?.rawScore ?? null,
        };
      }),
      speaking: packageSkills.includes(ExamSkill.SPEAKING)
        ? {
            scheduledAt: enrollment.speakingSlot?.startsAt,
            examiner: enrollment.speakingTeacher?.user.name,
          }
        : null,
      writing: packageSkills.includes(ExamSkill.WRITING)
        ? {
            examiner: enrollment.writingTeacher?.user.name,
          }
        : null,
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

    const paidOrders = profile.orders.filter((o) => o.status === 'PAID');
    const latestOrder = paidOrders[0] ?? null;
    const paidEnrollmentIds = new Set(
      paidOrders
        .map((o) => o.enrollmentId)
        .filter((id): id is string => id != null),
    );
    const purchasedEnrollments = profile.enrollments.filter(
      (e) => !e.reappointmentOfId && paidEnrollmentIds.has(e.id),
    );
    const mocksTotal = purchasedEnrollments.length;
    const mocksUsed = profile.enrollments.filter(
      (e) => e.status === 'COMPLETED' && paidEnrollmentIds.has(e.id),
    ).length;
    const mocksRemaining = profile.enrollments.filter(
      (e) =>
        paidEnrollmentIds.has(e.id) &&
        (e.status === 'ENROLLED' ||
          e.status === 'IN_PROGRESS' ||
          e.status === 'AWAITING_RESULTS'),
    ).length;

    return {
      name: profile.user.name,
      email: profile.user.email,
      phone: profile.phone,
      targetBand: profile.targetBand,
      examType: profile.examType.toLowerCase(),
      country: profile.country,
      dateOfBirth: profile.dateOfBirth,
      sex: profile.sex,
      firstLanguage: profile.firstLanguage,
      memberSince: profile.user.createdAt,
      publishToLeaderboard: profile.publishToLeaderboard,
      notificationPrefs: profile.notificationPrefs as
        | Record<string, boolean>
        | null,
      package: {
        title: latestOrder?.package?.title ?? null,
        purchasedAt: latestOrder?.createdAt ?? null,
        amount: latestOrder?.amount ?? null,
        currency: latestOrder?.currency ?? null,
        orderCode: latestOrder?.orderCode ?? null,
        skills: latestOrder?.package?.skills ?? [],
        mocksUsed,
        mocksTotal,
        mocksRemaining,
      },
      scoreHistory: await Promise.all(
        profile.enrollments
          .filter((e) => e.status === 'COMPLETED')
          .map(async (e) => {
            const scores = await this.resolveEnrollmentBands(e);
            return {
              date: e.mockDate,
              package: e.package.title,
              bands: scores.packageSkills.map((skill) => ({
                skill,
                band: scores.bySkill[skill] ?? null,
              })),
            };
          }),
      ),
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
        dateOfBirth?: Date | null;
        sex?: string | null;
        firstLanguage?: string | null;
        notificationPrefs?: Prisma.InputJsonValue;
      } = {};
      if (dto.phone !== undefined) profileData.phone = dto.phone.trim();
      if (dto.country !== undefined) profileData.country = dto.country.trim();
      if (dto.targetBand !== undefined) profileData.targetBand = dto.targetBand;
      if (dto.dateOfBirth !== undefined) {
        profileData.dateOfBirth = dto.dateOfBirth
          ? new Date(dto.dateOfBirth)
          : null;
      }
      if (dto.sex !== undefined) profileData.sex = dto.sex || null;
      if (dto.firstLanguage !== undefined) {
        profileData.firstLanguage = dto.firstLanguage.trim() || null;
      }
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
    const description = dto.relatedRef?.trim()
      ? `Related: ${dto.relatedRef.trim()}\n\n${dto.message.trim()}`
      : dto.message.trim();

    const ticket = await this.prisma.supportTicket.create({
      data: {
        ticketCode,
        subject: dto.subject.trim(),
        description,
        type: ticketType,
        priority: DEFAULT_TICKET_PRIORITY[ticketType],
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
          `${ticket.ticketCode}: ${user.name}: ${dto.subject}`,
          NotificationType.SYSTEM,
          '/admin/disputes',
        ),
      ),
    );

    return {
      id: ticket.id,
      ticketId: ticket.ticketCode,
      status: ticket.status.toLowerCase(),
      type: ticket.type.toLowerCase(),
      priority: ticket.priority.toLowerCase(),
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

  private async resolveEnrollmentBands(enrollment: {
    package: { skills: unknown };
    examSession?: {
      sectionAttempts: {
        skill: string;
        band: number | null;
        rawScore: number | null;
      }[];
    } | null;
  }) {
    const skills = packageExamSkills(enrollment.package.skills);
    const attempts = enrollment.examSession?.sectionAttempts ?? [];
    const bySkill: Record<string, number | null> = {
      listening: null,
      reading: null,
      writing: null,
      speaking: null,
    };

    for (const skill of skills) {
      const key = skill.toLowerCase();
      const attempt = attempts.find((a) => a.skill === skill);
      bySkill[key] = attempt
        ? await resolveAttemptBand(this.prisma, attempt)
        : null;
    }

    const overall = overallBandFromSkillBands(
      skills.map((s) => bySkill[s.toLowerCase()]),
    );

    return {
      bySkill,
      overall,
      packageSkills: skills.map((s) => s.toLowerCase()),
    };
  }

  private dedupeActivities<
    T extends { type: string; title: string; body: string; createdAt: Date },
  >(items: T[]): T[] {
    const seen = new Set<string>();
    return items.filter((item) => {
      const key = `${item.type}:${item.title}:${item.body}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private requireStudent(user: RequestUser) {
    if (!user.studentProfileId) {
      throw new ForbiddenException('Student profile required');
    }
  }
}
