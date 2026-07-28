import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CreditTxnType,
  EnrollmentStatus,
  ExamSkill,
  InstitutionMemberStatus,
  MarketingLogoStatus,
  NotificationType,
  OrderStatus,
  OrderType,
  Prisma,
  ResultsStatus,
  SlotStatus,
  TeacherSpeciality,
  TeacherStatus,
  UserRole,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { AuditAction } from '../../common/audit/audit.actions';
import { AuditService } from '../../common/audit/audit.service';
import { overallBandFromSkillBands } from '../../common/band-resolution';
import {
  CREDIT_PACKS,
  creditPackTotal,
  findCreditPack,
} from '../../config/credit-packs';
import { assertInstitutionOperational } from '../../common/institution/institution-access';
import { requireInstitutionId } from '../../common/institution/institution-scope';
import {
  teacherCanAccessSpeaking,
  teacherCanAccessWriting,
} from '../../common/teacher-speciality';
import { helpPathForReporter } from '../../common/support/support-routing';
import {
  ACTIVE_EXAM_STATES,
  mapLiveSessionRows,
} from '../../common/exam/live-monitor';
import { MailService } from '../../common/mail/mail.service';
import { StorageService } from '../../common/storage/storage.service';
import { RequestUser } from '../../common/types/request-user';
import { PrismaService } from '../../prisma/prisma.service';
import { evaluatePackageAvailability } from '../content/content-assignment';
import { packageExamSkills } from '../content/package-skills';
import { InstitutionMockSetsService } from '../institution-mock-sets/institution-mock-sets.service';
import { BookingsService } from '../bookings/bookings.service';
import { SettingsService } from '../settings/settings.service';
import {
  extractCalendarDateIso,
  hasExamStarted,
  zonedWallClockToUtc,
} from '../../common/mock-day-policy';
import {
  assertSpeakingGridTime,
  SPEAKING_SLOT_DURATION_MINUTES,
  wallClockHhMmInTimeZone,
} from '../../common/speaking-slot-grid';
import { studentMockDayPath } from '../../common/student-portal-paths';
import { UzumCheckoutService } from '../payments/uzum-checkout.service';
import { PaymentsService } from '../payments/payments.service';
import {
  examinerSpeakingPath,
  examinerWritingGradingHubPath,
} from '../../common/examiner/examiner-routing';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateCreditCheckoutDto } from './dto/create-credit-checkout.dto';
import { EnrollStudentsDto } from './dto/enroll-students.dto';
import { InviteExaminerDto } from './dto/invite-examiner.dto';
import { InviteStudentDto } from './dto/invite-student.dto';
import { ReassignExaminersDto } from './dto/reassign-examiners.dto';
import { UpdateExaminerDto } from './dto/update-examiner.dto';
import { UpdateInstitutionProfileDto } from './dto/update-institution-profile.dto';
import { UpdateInstitutionSupportTicketDto } from './dto/update-institution-support-ticket.dto';

const SETUP_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

const ACTIVE_ENROLLMENT_STATUSES: EnrollmentStatus[] = [
  EnrollmentStatus.ENROLLED,
  EnrollmentStatus.IN_PROGRESS,
  EnrollmentStatus.AWAITING_RESULTS,
];

/** Sections done (submitted) per skill for the L/R/W/S progress dots. */
type SectionProgress = {
  listening: boolean;
  reading: boolean;
  writing: boolean;
  speaking: boolean;
};

const enrollmentInclude = {
  student: { include: { user: { select: { name: true, email: true } } } },
  package: { select: { title: true, packageKind: true, skills: true } },
  writingTeacher: { include: { user: { select: { name: true } } } },
  speakingTeacher: { include: { user: { select: { name: true } } } },
  speakingSlot: { select: { id: true, startsAt: true } },
  examSession: {
    select: {
      checkInAt: true,
      sectionAttempts: {
        select: {
          skill: true,
          band: true,
          submittedAt: true,
          startedAt: true,
          writingSubmission: {
            select: { id: true, grade: { select: { overallBand: true } } },
          },
          speakingSession: {
            select: { id: true, grade: { select: { overallBand: true } } },
          },
        },
      },
    },
  },
} satisfies Prisma.EnrollmentInclude;

type EnrollmentWithRelations = Prisma.EnrollmentGetPayload<{
  include: typeof enrollmentInclude;
}>;

@Injectable()
export class InstitutionService {
  private readonly logger = new Logger(InstitutionService.name);

  constructor(
    private prisma: PrismaService,
    private bookings: BookingsService,
    private uzum: UzumCheckoutService,
    private mail: MailService,
    private audit: AuditService,
    private notifications: NotificationsService,
    private config: ConfigService,
    private storage: StorageService,
    private mockSets: InstitutionMockSetsService,
    private payments: PaymentsService,
    private settings: SettingsService,
  ) {}

  private appUrl(): string {
    return this.config.get<string>('APP_URL', 'http://localhost:3000').replace(/\/$/, '');
  }

  private async getInstitutionOrThrow(user: RequestUser) {
    const institutionId = requireInstitutionId(user);
    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
    });
    if (!institution) {
      throw new NotFoundException('Institution not found');
    }
    assertInstitutionOperational(institution);
    return institution;
  }

  private sectionProgress(enrollment: EnrollmentWithRelations): SectionProgress {
    const attempts = enrollment.examSession?.sectionAttempts ?? [];
    const done = (skill: string) =>
      attempts.some((a) => a.skill === skill && a.submittedAt != null);
    return {
      listening: done('LISTENING'),
      reading: done('READING'),
      writing: done('WRITING'),
      speaking: done('SPEAKING'),
    };
  }

  private overallBand(enrollment: EnrollmentWithRelations): number | null {
    const attempts = enrollment.examSession?.sectionAttempts ?? [];
    if (!attempts.length) return null;
    const bands = attempts.map((a) => {
      if (a.skill === 'WRITING') return a.writingSubmission?.grade?.overallBand ?? a.band;
      if (a.skill === 'SPEAKING') return a.speakingSession?.grade?.overallBand ?? a.band;
      return a.band;
    });
    return overallBandFromSkillBands(bands);
  }

  // ─── Overview ──────────────────────────────────────────────────────────────

  async getOverview(user: RequestUser) {
    const institution = await this.getInstitutionOrThrow(user);
    const institutionId = institution.id;
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [activeStudents, pendingStudents, grantedSetCount, upcoming, recent] =
      await Promise.all([
      this.prisma.studentProfile.count({
        where: { institutionId, institutionStatus: InstitutionMemberStatus.ACTIVE },
      }),
      this.prisma.studentProfile.count({
        where: { institutionId, institutionStatus: InstitutionMemberStatus.PENDING },
      }),
      this.prisma.institutionMockSetGrant.count({
        where: { institutionId, set: { isActive: true } },
      }),
      this.prisma.enrollment.findMany({
        where: {
          institutionId,
          status: { in: [EnrollmentStatus.ENROLLED, EnrollmentStatus.IN_PROGRESS] },
        },
        include: enrollmentInclude,
        orderBy: { mockDate: 'asc' },
        take: 6,
      }),
      this.prisma.enrollment.findMany({
        where: { institutionId, resultsStatus: ResultsStatus.RELEASED },
        include: enrollmentInclude,
        orderBy: { updatedAt: 'desc' },
        take: 6,
      }),
    ]);

    const upcomingCount = await this.prisma.enrollment.count({
      where: {
        institutionId,
        mockDate: { gte: now, lte: in7Days },
        status: { in: [EnrollmentStatus.ENROLLED, EnrollmentStatus.IN_PROGRESS] },
      },
    });

    const releasedBands = recent
      .map((e) => this.overallBand(e))
      .filter((b): b is number => b != null);
    const avgCohortBand = releasedBands.length
      ? Math.round((releasedBands.reduce((a, b) => a + b, 0) / releasedBands.length) * 10) / 10
      : null;

    const timeZone = await this.settings.getPlatformTimezone();

    return {
      centerName: institution.name,
      grantedSetCount,
      wholesalePrice: institution.wholesalePrice,
      currency: institution.currency,
      activeStudents,
      pendingStudents,
      upcomingMocksCount: upcomingCount,
      avgCohortBand,
      upcomingMocks: upcoming.map((e) => this.mapEnrollmentRow(e, timeZone)),
      recentResults: recent.map((e) => ({
        id: e.id,
        studentName: e.student.user.name,
        overallBand: this.overallBand(e),
        targetBand: e.student.targetBand ?? null,
        date: e.updatedAt,
      })),
    };
  }

  private mapEnrollmentRow(
    e: EnrollmentWithRelations,
    timeZone?: string,
  ) {
    const skills = packageExamSkills(e.package.skills);
    const speakingTime = e.speakingSlot
      ? wallClockHhMmInTimeZone(e.speakingSlot.startsAt, timeZone)
      : null;
    return {
      id: e.id,
      enrollmentCode: e.enrollmentCode,
      studentName: e.student.user.name,
      packageTitle: e.package.title,
      mockDate: e.mockDate,
      mockTime: e.mockTime,
      speakingTime,
      speakingStartsAt: e.speakingSlot?.startsAt ?? null,
      status: e.status.toLowerCase(),
      examiner:
        e.writingTeacher?.user.name ?? e.speakingTeacher?.user.name ?? null,
      writingTeacherId: e.writingTeacherId,
      writingTeacherName: e.writingTeacher?.user.name ?? null,
      speakingTeacherId: e.speakingTeacherId,
      speakingTeacherName: e.speakingTeacher?.user.name ?? null,
      needsWriting: skills.includes(ExamSkill.WRITING),
      needsSpeaking: skills.includes(ExamSkill.SPEAKING),
      progress: this.sectionProgress(e),
      overallBand: this.overallBand(e),
      resultsStatus: e.resultsStatus.toLowerCase(),
      canCancel:
        e.status === EnrollmentStatus.ENROLLED &&
        !hasExamStarted({
          checkInAt: e.examSession?.checkInAt ?? null,
          sectionAttempts: e.examSession?.sectionAttempts ?? [],
        }),
    };
  }

  // ─── Credits (legacy wallet; institution UI retired — set shop is primary) ─

  async getCredits(user: RequestUser) {
    const institution = await this.getInstitutionOrThrow(user);
    const institutionId = institution.id;
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [txns, purchaseAgg, consumeThisMonth] = await Promise.all([
      this.prisma.institutionCreditTxn.findMany({
        where: { institutionId },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      this.prisma.institutionCreditTxn.aggregate({
        where: { institutionId, type: CreditTxnType.PURCHASE },
        _sum: { delta: true },
      }),
      this.prisma.institutionCreditTxn.count({
        where: {
          institutionId,
          type: CreditTxnType.CONSUME,
          createdAt: { gte: startOfMonth },
        },
      }),
    ]);

    return {
      balance: institution.creditBalance,
      wholesalePrice: institution.wholesalePrice,
      currency: institution.currency,
      totalPurchased: purchaseAgg._sum.delta ?? 0,
      creditsUsedThisMonth: consumeThisMonth,
      packs: CREDIT_PACKS.map((pack) => ({
        id: pack.id,
        label: pack.label,
        credits: pack.credits,
        discountPct: pack.discountPct,
        popular: pack.popular ?? false,
        total: creditPackTotal(pack, institution.wholesalePrice),
        pricePerCredit: Math.round(
          institution.wholesalePrice * (1 - pack.discountPct / 100),
        ),
      })),
      ledger: txns.map((t) => ({
        id: t.id,
        type: t.type.toLowerCase(),
        delta: t.delta,
        balanceAfter: t.balanceAfter,
        reference: t.reference,
        note: t.note,
        date: t.createdAt,
      })),
    };
  }

  async getMocks(user: RequestUser) {
    const institution = await this.getInstitutionOrThrow(user);
    return this.mockSets.listMocksForInstitution(
      institution.id,
      institution.currency,
    );
  }

  async getMockShop(user: RequestUser) {
    const institution = await this.getInstitutionOrThrow(user);
    return this.mockSets.listShopForInstitution(
      institution.id,
      institution.currency,
    );
  }

  async createMockSetCheckout(user: RequestUser, setId: string) {
    const institution = await this.getInstitutionOrThrow(user);
    const set = await this.mockSets.getSetForCheckout(setId, institution.id);
    const amount = set.listPrice;
    const orderCode = `IMS-${randomBytes(4).toString('hex').toUpperCase()}`;

    const order = await this.prisma.order.create({
      data: {
        orderCode,
        orderType: OrderType.INSTITUTION_MOCK_SET,
        institutionId: institution.id,
        institutionMockSetId: set.id,
        amount,
        currency: institution.currency,
        status: OrderStatus.PENDING,
      },
    });

    if (!this.uzum.isConfigured()) {
      throw new BadRequestException(
        'Online payment is not configured. Contact the platform to purchase mock sets.',
      );
    }

    const checkout = await this.uzum.createCheckout({
      orderId: order.id,
      orderCode: order.orderCode,
      email: institution.contactEmail,
      name: institution.name,
      amount,
      currency: institution.currency,
      packageTitle: set.title,
      clientId: institution.id,
      successPath: '/institution/tests/purchased?payment=success',
      failurePath: '/institution/mocks/shop?payment=failed',
      sessionTimeoutSecs: 1800,
    });

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        uzumCheckoutId: checkout.checkoutId,
        checkoutUrl: checkout.checkoutUrl,
        checkoutExpiresAt: expiresAt,
      },
    });

    return {
      orderCode: order.orderCode,
      checkoutUrl: checkout.checkoutUrl,
      setId: set.id,
      setTitle: set.title,
      amount,
    };
  }

  async getMockSetOrderStatus(user: RequestUser, orderCode: string) {
    const institutionId = requireInstitutionId(user);
    const order = await this.prisma.order.findFirst({
      where: {
        orderCode,
        institutionId,
        orderType: OrderType.INSTITUTION_MOCK_SET,
      },
    });
    if (!order) throw new NotFoundException('Order not found');

    if (order.status === OrderStatus.PENDING && order.uzumCheckoutId) {
      await this.payments.reconcilePendingOrder(order.id);
    } else if (order.status === OrderStatus.PAID) {
      // Heal races where the order was marked PAID before grant creation finished,
      // or an earlier admin grant short-circuited purchase fulfillment.
      await this.payments.fulfillByOrderId(order.id);
    }

    const refreshed = await this.prisma.order.findFirst({
      where: {
        orderCode,
        institutionId,
        orderType: OrderType.INSTITUTION_MOCK_SET,
      },
    });
    const current = refreshed ?? order;

    return {
      orderCode: current.orderCode,
      status: current.status.toLowerCase(),
      setId: current.institutionMockSetId,
      checkoutUrl: current.checkoutUrl,
    };
  }

  async createCreditCheckout(user: RequestUser, dto: CreateCreditCheckoutDto) {
    const institution = await this.getInstitutionOrThrow(user);
    const pack = findCreditPack(dto.packId);
    if (!pack) {
      throw new BadRequestException('Unknown credit pack');
    }
    const amount = creditPackTotal(pack, institution.wholesalePrice);
    const orderCode = `CRD-${randomBytes(4).toString('hex').toUpperCase()}`;

    const order = await this.prisma.order.create({
      data: {
        orderCode,
        orderType: OrderType.CREDIT_PACK,
        institutionId: institution.id,
        creditQuantity: pack.credits,
        amount,
        currency: institution.currency,
        status: OrderStatus.PENDING,
      },
    });

    if (!this.uzum.isConfigured()) {
      throw new BadRequestException(
        'Online payment is not configured. Contact the platform to top up credits.',
      );
    }

    const checkout = await this.uzum.createCheckout({
      orderId: order.id,
      orderCode: order.orderCode,
      email: institution.contactEmail,
      name: institution.name,
      amount,
      currency: institution.currency,
      packageTitle: `${pack.credits} mock credits`,
      clientId: institution.id,
      successPath: '/institution/credits?payment=success',
      failurePath: '/institution/credits?payment=failed',
      sessionTimeoutSecs: 1800,
    });

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        uzumCheckoutId: checkout.checkoutId,
        checkoutUrl: checkout.checkoutUrl,
        checkoutExpiresAt: expiresAt,
      },
    });

    return {
      orderCode: order.orderCode,
      checkoutUrl: checkout.checkoutUrl,
      credits: pack.credits,
      amount,
    };
  }

  async getCreditOrderStatus(user: RequestUser, orderCode: string) {
    const institutionId = requireInstitutionId(user);
    const order = await this.prisma.order.findFirst({
      where: { orderCode, institutionId, orderType: OrderType.CREDIT_PACK },
    });
    if (!order) throw new NotFoundException('Order not found');

    if (order.status === OrderStatus.PENDING && order.uzumCheckoutId) {
      await this.payments.reconcilePendingOrder(order.id);
      const refreshed = await this.prisma.order.findFirst({
        where: { orderCode, institutionId, orderType: OrderType.CREDIT_PACK },
      });
      if (refreshed) {
        return {
          orderCode: refreshed.orderCode,
          status: refreshed.status.toLowerCase(),
          credits: refreshed.creditQuantity,
          checkoutUrl: refreshed.checkoutUrl,
        };
      }
    }

    return {
      orderCode: order.orderCode,
      status: order.status.toLowerCase(),
      credits: order.creditQuantity,
      checkoutUrl: order.checkoutUrl,
    };
  }

  // ─── Students ────────────────────────────────────────────────────────────

  async listStudents(user: RequestUser, status?: string) {
    const institutionId = requireInstitutionId(user);
    const where: Prisma.StudentProfileWhereInput = { institutionId };
    const normalized = status?.toUpperCase();
    if (
      normalized === 'ACTIVE' ||
      normalized === 'PENDING' ||
      normalized === 'REJECTED'
    ) {
      where.institutionStatus = normalized as InstitutionMemberStatus;
    }

    const students = await this.prisma.studentProfile.findMany({
      where,
      include: {
        user: { select: { name: true, email: true, emailVerifiedAt: true } },
        enrollments: {
          include: enrollmentInclude,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const rows = students.map((s) => {
      const released = s.enrollments
        .filter((e) => e.resultsStatus === ResultsStatus.RELEASED)
        .map((e) => this.overallBand(e))
        .filter((b): b is number => b != null);
      const latestBand = released.length ? released[0] : null;
      return {
        id: s.id,
        name: s.user.name,
        email: s.user.email,
        status: (s.institutionStatus ?? InstitutionMemberStatus.PENDING).toLowerCase(),
        verified: s.user.emailVerifiedAt != null,
        joinedAt: s.createdAt,
        targetBand: s.targetBand ?? null,
        mocksTaken: s.enrollments.length,
        latestBand,
      };
    });

    const activeRows = rows.filter((r) => r.status === 'active');
    const avgBand = (() => {
      const bands = activeRows
        .map((r) => r.latestBand)
        .filter((b): b is number => b != null);
      return bands.length
        ? Math.round((bands.reduce((a, b) => a + b, 0) / bands.length) * 10) / 10
        : null;
    })();

    return {
      summary: {
        total: rows.length,
        active: activeRows.length,
        pending: rows.filter((r) => r.status === 'pending').length,
        avgBand,
        reachedBand7: activeRows.filter((r) => (r.latestBand ?? 0) >= 7).length,
      },
      students: rows,
    };
  }

  private async loadInstitutionStudent(institutionId: string, studentId: string) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { id: studentId },
      include: { user: { select: { id: true, name: true } } },
    });
    if (!student || student.institutionId !== institutionId) {
      throw new NotFoundException('Student not found for this institution');
    }
    return student;
  }

  async approveStudent(user: RequestUser, studentId: string) {
    const institutionId = requireInstitutionId(user);
    const student = await this.loadInstitutionStudent(institutionId, studentId);

    await this.prisma.studentProfile.update({
      where: { id: student.id },
      data: { institutionStatus: InstitutionMemberStatus.ACTIVE },
    });

    await this.notifications.create(
      student.user.id,
      'Access granted',
      'Your center approved your account. You can now be enrolled into mock exams.',
      NotificationType.INFO,
      '/student',
    );

    await this.audit.log({
      userId: user.id,
      action: AuditAction.INSTITUTION_STUDENT_APPROVE,
      entity: 'student_profile',
      entityId: student.id,
      metadata: { institutionId },
    });

    return { status: 'active' };
  }

  async rejectStudent(user: RequestUser, studentId: string) {
    const institutionId = requireInstitutionId(user);
    const student = await this.loadInstitutionStudent(institutionId, studentId);

    await this.prisma.studentProfile.update({
      where: { id: student.id },
      data: { institutionStatus: InstitutionMemberStatus.REJECTED },
    });

    await this.audit.log({
      userId: user.id,
      action: AuditAction.INSTITUTION_STUDENT_REJECT,
      entity: 'student_profile',
      entityId: student.id,
      metadata: { institutionId },
    });

    return { status: 'rejected' };
  }

  /** Soft-unlink: clear centre membership, keep the User account. */
  async removeStudent(user: RequestUser, studentId: string) {
    const institutionId = requireInstitutionId(user);
    const student = await this.loadInstitutionStudent(institutionId, studentId);

    if (student.institutionStatus === InstitutionMemberStatus.PENDING) {
      throw new BadRequestException(
        'Reject pending students instead of removing them.',
      );
    }

    const activeEnrollments = await this.prisma.enrollment.count({
      where: {
        studentId: student.id,
        institutionId,
        status: { in: ACTIVE_ENROLLMENT_STATUSES },
      },
    });
    if (activeEnrollments > 0) {
      throw new BadRequestException(
        `Cannot remove: student has ${activeEnrollments} active enrollment(s). Complete or cancel them first.`,
      );
    }

    await this.prisma.$transaction([
      this.prisma.studentProfile.update({
        where: { id: student.id },
        data: {
          institutionId: null,
          institutionStatus: InstitutionMemberStatus.REMOVED,
        },
      }),
      this.prisma.user.update({
        where: { id: student.userId },
        data: { institutionId: null },
      }),
    ]);

    await this.audit.log({
      userId: user.id,
      action: AuditAction.INSTITUTION_STUDENT_REMOVE,
      entity: 'student_profile',
      entityId: student.id,
      metadata: { institutionId },
    });

    return { removed: true };
  }

  async inviteStudent(user: RequestUser, dto: InviteStudentDto) {
    const institution = await this.getInstitutionOrThrow(user);
    const email = dto.email.trim().toLowerCase();
    const name = dto.name.trim();

    const existing = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException(
        'This email is already registered on iTestU. Ask the student to sign in instead.',
      );
    }

    const rawToken = randomBytes(32).toString('hex');
    const passwordResetToken = createHash('sha256').update(rawToken).digest('hex');
    const passwordResetExpires = new Date(Date.now() + SETUP_TOKEN_TTL_MS);
    const passwordHash = await bcrypt.hash(randomBytes(16).toString('hex'), 12);

    const created = await this.prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        role: UserRole.STUDENT,
        institutionId: institution.id,
        passwordResetToken,
        passwordResetExpires,
        studentProfile: {
          create: {
            institutionId: institution.id,
            institutionStatus: InstitutionMemberStatus.PENDING,
          },
        },
      },
      include: { studentProfile: true },
    });

    const setupUrl = `${this.appUrl()}/reset-password?token=${rawToken}`;
    void this.mail
      .sendInstitutionStudentInviteEmail(email, name, institution.name, setupUrl)
      .catch(() => undefined);

    await this.audit.log({
      userId: user.id,
      action: AuditAction.INSTITUTION_STUDENT_JOIN,
      entity: 'user',
      entityId: created.id,
      metadata: { source: 'panel', institutionId: institution.id },
    });

    return {
      invited: true,
      studentId: created.studentProfile?.id,
      email,
      name,
    };
  }

  async getLiveSessions(user: RequestUser) {
    const institution = await this.getInstitutionOrThrow(user);
    const sessions = await this.prisma.examSession.findMany({
      where: {
        state: { in: [...ACTIVE_EXAM_STATES] },
        enrollment: { institutionId: institution.id },
      },
      include: {
        enrollment: {
          include: {
            student: { include: { user: true } },
            speakingTeacher: { include: { user: true } },
          },
        },
        sectionAttempts: true,
      },
      take: 20,
    });

    return mapLiveSessionRows(sessions);
  }

  async getMonitorNavBadges(user: RequestUser) {
    const institution = await this.getInstitutionOrThrow(user);
    const [liveSessions, flaggedSessions] = await Promise.all([
      this.prisma.examSession.count({
        where: {
          state: { in: [...ACTIVE_EXAM_STATES] },
          enrollment: { institutionId: institution.id },
        },
      }),
      this.prisma.examSession.count({
        where: {
          state: { in: [...ACTIVE_EXAM_STATES] },
          integrity: 'FLAGGED',
          enrollment: { institutionId: institution.id },
        },
      }),
    ]);

    return { liveSessions, flaggedSessions };
  }

  // ─── Enroll (granted sets / own packages — no credit debit) ──────────────

  async enrollStudents(user: RequestUser, dto: EnrollStudentsDto) {
    const institution = await this.getInstitutionOrThrow(user);
    const institutionId = institution.id;

    if (dto.studentIds.length !== 1) {
      throw new BadRequestException('Enroll one student at a time');
    }

    const pkg = await this.prisma.mockTestPackage.findUnique({
      where: { id: dto.packageId },
    });
    if (!pkg || !pkg.isActive) {
      throw new BadRequestException('Package not found or inactive');
    }
    if (pkg.institutionId != null && pkg.institutionId !== institutionId) {
      throw new BadRequestException('This package does not belong to your centre');
    }

    const isOwnPackage = pkg.institutionId === institutionId;
    if (!isOwnPackage) {
      const granted = await this.mockSets.hasGrantedSetPackage(
        institutionId,
        pkg.id,
      );
      if (!granted) {
        throw new BadRequestException(
          'Package not included in your granted mock sets',
        );
      }
    }

    const skills = packageExamSkills(pkg.skills);
    const needsWriting = skills.includes(ExamSkill.WRITING);
    const needsSpeaking = skills.includes(ExamSkill.SPEAKING);

    if (needsWriting && !dto.writingTeacherId) {
      throw new BadRequestException(
        'Writing examiner is required for this package',
      );
    }
    if (needsSpeaking && !dto.speakingTeacherId) {
      throw new BadRequestException(
        'Speaking examiner is required for this package',
      );
    }
    if (needsSpeaking && !dto.speakingSlotId && !dto.speakingTime) {
      throw new BadRequestException(
        'Speaking time is required for the assigned speaking examiner',
      );
    }
    if (!needsSpeaking && (dto.speakingSlotId || dto.speakingTime)) {
      throw new BadRequestException(
        'Speaking time is not required for this package',
      );
    }
    if (needsSpeaking && dto.speakingTime && dto.speakingTeacherId) {
      await this.assertSpeakingExaminerTimeAvailable(
        dto.speakingTeacherId,
        dto.mockDate,
        dto.speakingTime,
      );
    }

    // Validate examiners belong to this institution when provided.
    for (const teacherId of [dto.writingTeacherId, dto.speakingTeacherId]) {
      if (!teacherId) continue;
      const teacher = await this.prisma.teacherProfile.findUnique({
        where: { id: teacherId },
        select: { institutionId: true },
      });
      if (!teacher || teacher.institutionId !== institutionId) {
        throw new BadRequestException('Examiner does not belong to this institution');
      }
    }

    if (dto.speakingSlotId && dto.speakingTeacherId) {
      const slot = await this.prisma.teacherSlot.findUnique({
        where: { id: dto.speakingSlotId },
        select: { teacherId: true, status: true },
      });
      if (!slot || slot.status !== SlotStatus.AVAILABLE) {
        throw new BadRequestException('Speaking slot is no longer available');
      }
      if (slot.teacherId !== dto.speakingTeacherId) {
        throw new BadRequestException(
          'Speaking slot must belong to the selected speaking examiner',
        );
      }
    }

    const results: { studentId: string; enrollmentCode?: string; error?: string }[] =
      [];

    for (const studentId of dto.studentIds) {
      const student = await this.loadInstitutionStudent(institutionId, studentId);
      if (student.institutionStatus !== InstitutionMemberStatus.ACTIVE) {
        results.push({ studentId, error: 'Student is not approved' });
        continue;
      }

      const availability = await evaluatePackageAvailability(
        this.prisma,
        student.id,
        pkg,
      );
      if (!availability.canPurchase) {
        results.push({
          studentId,
          error:
            availability.blockingReason ??
            'This student cannot be enrolled in this package.',
        });
        continue;
      }

      // Platform catalog packages require a granted mock set (no credit debit).
      try {
        const enrollment = await this.bookings.provisionEnrollment({
          studentProfileId: student.id,
          actorUserId: user.id,
          packageId: dto.packageId,
          mockDate: dto.mockDate,
          writingTeacherId: dto.writingTeacherId,
          speakingTeacherId: dto.speakingTeacherId,
          speakingSlotId: dto.speakingSlotId,
          speakingTime: dto.speakingTime,
          institutionId,
          institutionGranted: true,
          auditAction: AuditAction.INSTITUTION_ENROLL,
        });

        results.push({ studentId, enrollmentCode: enrollment.enrollmentCode });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Enrollment failed';
        results.push({ studentId, error: message });
      }
    }

    return {
      enrolled: results.filter((r) => r.enrollmentCode).length,
      failed: results.filter((r) => r.error),
    };
  }

  /** Prevent double-booking a centre speaking examiner at the same time. */
  private async assertSpeakingExaminerTimeAvailable(
    teacherId: string,
    mockDate: string,
    speakingTime: string,
  ) {
    if (!/^\d{2}:\d{2}$/.test(speakingTime)) {
      throw new BadRequestException('speakingTime must be in HH:mm format');
    }
    assertSpeakingGridTime(speakingTime);
    const timeZone = await this.settings.getPlatformTimezone();
    const [hours, minutes] = speakingTime.split(':').map(Number);
    const dateIso = extractCalendarDateIso(mockDate, timeZone);
    const startsAt = zonedWallClockToUtc(dateIso, hours!, minutes!, 0, timeZone);

    const existing = await this.prisma.teacherSlot.findUnique({
      where: {
        teacherId_startsAt: { teacherId, startsAt },
      },
      select: { status: true },
    });
    if (
      existing &&
      (existing.status === SlotStatus.BOOKED ||
        existing.status === SlotStatus.BLOCKED)
    ) {
      throw new BadRequestException(
        'This speaking examiner is already booked at that time. Choose a different time.',
      );
    }
  }

  // ─── Examiners ───────────────────────────────────────────────────────────

  async listExaminers(user: RequestUser) {
    const institutionId = requireInstitutionId(user);
    const teachers = await this.prisma.teacherProfile.findMany({
      where: { institutionId },
      include: { user: { select: { name: true, email: true, emailVerifiedAt: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const rows = teachers.map((t) => ({
      id: t.id,
      name: t.user.name,
      email: t.user.email,
      speciality: t.speciality.toLowerCase(),
      status: t.user.emailVerifiedAt ? 'active' : 'pending',
      rating: t.rating ?? null,
      totalSessions: t.totalSessions,
    }));

    return {
      summary: {
        total: rows.length,
        active: rows.filter((r) => r.status === 'active').length,
        pendingInvitations: rows.filter((r) => r.status === 'pending').length,
        avgRating: (() => {
          const ratings = rows
            .map((r) => r.rating)
            .filter((r): r is number => r != null);
          return ratings.length
            ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
            : null;
        })(),
        sessionsDelivered: rows.reduce((a, r) => a + r.totalSessions, 0),
      },
      examiners: rows,
    };
  }

  async inviteExaminer(user: RequestUser, dto: InviteExaminerDto) {
    const institution = await this.getInstitutionOrThrow(user);
    const email = dto.email.trim().toLowerCase();

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    const rawToken = randomBytes(32).toString('hex');
    const passwordResetToken = createHash('sha256').update(rawToken).digest('hex');
    const passwordResetExpires = new Date(Date.now() + SETUP_TOKEN_TTL_MS);
    // Unusable random password; the examiner must set one via the emailed link.
    const passwordHash = await bcrypt.hash(randomBytes(16).toString('hex'), 12);

    const created = await this.prisma.user.create({
      data: {
        email,
        name: dto.name.trim(),
        passwordHash,
        role: UserRole.TEACHER,
        institutionId: institution.id,
        passwordResetToken,
        passwordResetExpires,
        teacherProfile: {
          create: {
            institutionId: institution.id,
            speciality: dto.speciality as TeacherSpeciality,
            // Institution examiners are auto-approved; "pending" in the UI means
            // onboarding (password set) is not yet complete.
            status: TeacherStatus.APPROVED,
          },
        },
      },
      include: { teacherProfile: true },
    });

    const setupUrl = `${this.appUrl()}/reset-password?token=${rawToken}`;
    void this.mail
      .sendInstitutionExaminerInviteEmail(email, dto.name.trim(), institution.name, setupUrl)
      .catch(() => undefined);

    await this.audit.log({
      userId: user.id,
      action: AuditAction.INSTITUTION_EXAMINER_INVITE,
      entity: 'teacher_profile',
      entityId: created.teacherProfile?.id,
      metadata: { institutionId: institution.id, email },
    });

    return { invited: true, examinerId: created.teacherProfile?.id };
  }

  async updateExaminer(
    user: RequestUser,
    examinerId: string,
    dto: UpdateExaminerDto,
  ) {
    const institutionId = requireInstitutionId(user);
    const teacher = await this.loadInstitutionExaminer(
      institutionId,
      examinerId,
    );
    const nextSpeciality = dto.speciality as TeacherSpeciality;

    if (teacher.speciality === nextSpeciality) {
      return {
        updated: true,
        speciality: teacher.speciality.toLowerCase(),
      };
    }

    const losingSpeaking =
      teacherCanAccessSpeaking(teacher.speciality) &&
      !teacherCanAccessSpeaking(nextSpeciality);
    const losingWriting =
      teacherCanAccessWriting(teacher.speciality) &&
      !teacherCanAccessWriting(nextSpeciality);

    if (losingSpeaking) {
      const blockers = await this.examinerSpeakingBlockers(
        examinerId,
        institutionId,
      );
      if (blockers.length > 0) {
        throw new BadRequestException(
          `Cannot switch to this speciality: ${blockers.join(' ')}`,
        );
      }
    }
    if (losingWriting) {
      const blockers = await this.examinerWritingBlockers(
        examinerId,
        institutionId,
      );
      if (blockers.length > 0) {
        throw new BadRequestException(
          `Cannot switch to this speciality: ${blockers.join(' ')}`,
        );
      }
    }

    await this.prisma.teacherProfile.update({
      where: { id: examinerId },
      data: { speciality: nextSpeciality },
    });

    await this.audit.log({
      userId: user.id,
      action: AuditAction.INSTITUTION_EXAMINER_UPDATE,
      entity: 'teacher_profile',
      entityId: examinerId,
      metadata: {
        institutionId,
        speciality: nextSpeciality.toLowerCase(),
      },
    });

    return { updated: true, speciality: nextSpeciality.toLowerCase() };
  }

  async removeExaminer(user: RequestUser, examinerId: string) {
    const institutionId = requireInstitutionId(user);
    const teacher = await this.loadInstitutionExaminer(
      institutionId,
      examinerId,
    );

    const blockers = await this.examinerRemovalBlockers(
      examinerId,
      institutionId,
    );
    if (blockers.length > 0) {
      throw new BadRequestException(blockers.join(' '));
    }

    const pendingInvite = teacher.user.emailVerifiedAt == null;

    if (pendingInvite) {
      await this.prisma.user.delete({ where: { id: teacher.userId } });
    } else {
      await this.prisma.$transaction([
        this.prisma.teacherProfile.update({
          where: { id: examinerId },
          data: { institutionId: null },
        }),
        this.prisma.user.update({
          where: { id: teacher.userId },
          data: { institutionId: null },
        }),
      ]);
    }

    await this.audit.log({
      userId: user.id,
      action: AuditAction.INSTITUTION_EXAMINER_REMOVE,
      entity: 'teacher_profile',
      entityId: examinerId,
      metadata: {
        institutionId,
        pendingInvite,
        email: teacher.user.email,
      },
    });

    return { removed: true };
  }

  private async loadInstitutionExaminer(
    institutionId: string,
    examinerId: string,
  ) {
    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { id: examinerId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            institutionId: true,
            emailVerifiedAt: true,
          },
        },
      },
    });
    if (!teacher || teacher.institutionId !== institutionId) {
      throw new NotFoundException('Examiner not found');
    }
    return teacher;
  }

  private async examinerRemovalBlockers(
    examinerId: string,
    institutionId: string,
  ): Promise<string[]> {
    return [
      ...(await this.examinerSpeakingBlockers(examinerId, institutionId)),
      ...(await this.examinerWritingBlockers(examinerId, institutionId)),
    ];
  }

  private async examinerSpeakingBlockers(
    examinerId: string,
    institutionId: string,
  ): Promise<string[]> {
    const messages: string[] = [];
    const speakingAssignments = await this.prisma.enrollment.count({
      where: {
        institutionId,
        status: { in: ACTIVE_ENROLLMENT_STATUSES },
        speakingTeacherId: examinerId,
      },
    });
    if (speakingAssignments > 0) {
      messages.push(
        `They are the speaking examiner on ${speakingAssignments} active enrollment(s).`,
      );
    }

    const pendingSpeaking = await this.prisma.speakingSession.count({
      where: {
        teacherId: examinerId,
        OR: [
          { status: 'COMPLETED', grade: null },
          { status: { in: ['SCHEDULED', 'WAITING', 'ACTIVE'] } },
        ],
      },
    });
    if (pendingSpeaking > 0) {
      messages.push(
        `They still have ${pendingSpeaking} speaking session(s) to deliver or grade.`,
      );
    }
    return messages;
  }

  private async examinerWritingBlockers(
    examinerId: string,
    institutionId: string,
  ): Promise<string[]> {
    const messages: string[] = [];
    const writingAssignments = await this.prisma.enrollment.count({
      where: {
        institutionId,
        status: { in: ACTIVE_ENROLLMENT_STATUSES },
        writingTeacherId: examinerId,
      },
    });
    if (writingAssignments > 0) {
      messages.push(
        `They are the writing examiner on ${writingAssignments} active enrollment(s).`,
      );
    }

    const pendingWriting = await this.prisma.writingSubmission.count({
      where: {
        teacherId: examinerId,
        status: { in: ['PENDING', 'IN_REVIEW'] },
      },
    });
    if (pendingWriting > 0) {
      messages.push(
        `They still have ${pendingWriting} writing submission(s) to grade.`,
      );
    }
    return messages;
  }

  // ─── Enrollments pipeline ────────────────────────────────────────────────

  async listEnrollments(user: RequestUser) {
    const institutionId = requireInstitutionId(user);
    const [enrollments, timeZone] = await Promise.all([
      this.prisma.enrollment.findMany({
        where: { institutionId },
        include: enrollmentInclude,
        orderBy: { mockDate: 'desc' },
      }),
      this.settings.getPlatformTimezone(),
    ]);

    const rows = enrollments.map((e) => this.mapEnrollmentRow(e, timeZone));
    const byStatus = (status: EnrollmentStatus) =>
      enrollments.filter((e) => e.status === status).length;

    return {
      summary: {
        scheduled: byStatus(EnrollmentStatus.ENROLLED),
        inProgress: byStatus(EnrollmentStatus.IN_PROGRESS),
        awaitingResults: byStatus(EnrollmentStatus.AWAITING_RESULTS),
        completed: byStatus(EnrollmentStatus.COMPLETED),
      },
      enrollments: rows,
    };
  }

  /**
   * Cancel a centre enrollment that has not started yet. Releases the speaking
   * slot so the examiner time becomes available again.
   */
  async cancelEnrollment(user: RequestUser, enrollmentId: string) {
    const institutionId = requireInstitutionId(user);
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { id: enrollmentId, institutionId },
      include: {
        student: { include: { user: true } },
        examSession: {
          include: {
            sectionAttempts: { select: { startedAt: true } },
          },
        },
      },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');

    if (enrollment.status !== EnrollmentStatus.ENROLLED) {
      throw new BadRequestException(
        'Only scheduled enrollments that have not started can be cancelled',
      );
    }
    if (
      hasExamStarted({
        checkInAt: enrollment.examSession?.checkInAt ?? null,
        sectionAttempts: enrollment.examSession?.sectionAttempts ?? [],
      })
    ) {
      throw new BadRequestException(
        'Cannot cancel a mock after the student has started',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      if (enrollment.speakingSlotId) {
        await tx.teacherSlot.updateMany({
          where: {
            id: enrollment.speakingSlotId,
            status: SlotStatus.BOOKED,
          },
          data: { status: SlotStatus.AVAILABLE, version: { increment: 1 } },
        });
      }

      await tx.enrollment.update({
        where: { id: enrollmentId },
        data: {
          status: EnrollmentStatus.CANCELLED,
          speakingSlotId: null,
        },
      });
    });

    await this.notifications.create(
      enrollment.student.userId,
      'Mock cancelled',
      `Your centre mock (${enrollment.enrollmentCode}) was cancelled by your institution.`,
      NotificationType.INFO,
      studentMockDayPath(institutionId),
    );

    await this.audit.log({
      userId: user.id,
      action: AuditAction.INSTITUTION_ENROLLMENT_CANCEL,
      entity: 'enrollment',
      entityId: enrollmentId,
      metadata: {
        enrollmentCode: enrollment.enrollmentCode,
        speakingSlotId: enrollment.speakingSlotId,
      },
    });

    return { cancelled: true };
  }

  /**
   * Reassign writing and/or speaking examiners after enrol (ops fix when
   * assignment was missing or the examiner is unavailable).
   * Speaking reassign transfers the booked TeacherSlot to the new examiner at
   * the same wall-clock time so the student keeps their speaking appointment.
   */
  async reassignExaminers(
    user: RequestUser,
    enrollmentId: string,
    dto: ReassignExaminersDto,
  ) {
    const institutionId = requireInstitutionId(user);
    if (!dto.writingTeacherId && !dto.speakingTeacherId) {
      throw new BadRequestException(
        'Provide writingTeacherId and/or speakingTeacherId',
      );
    }

    const enrollment = await this.prisma.enrollment.findFirst({
      where: { id: enrollmentId, institutionId },
      include: {
        package: { select: { skills: true } },
        speakingSlot: true,
        examSession: {
          include: {
            sectionAttempts: {
              include: { writingSubmission: true, speakingSession: true },
            },
          },
        },
      },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');

    const skills = packageExamSkills(enrollment.package.skills);
    const needsWriting = skills.includes(ExamSkill.WRITING);
    const needsSpeaking = skills.includes(ExamSkill.SPEAKING);

    if (dto.writingTeacherId && !needsWriting) {
      throw new BadRequestException('This package does not include Writing');
    }
    if (dto.speakingTeacherId && !needsSpeaking) {
      throw new BadRequestException('This package does not include Speaking');
    }

    for (const teacherId of [dto.writingTeacherId, dto.speakingTeacherId]) {
      if (!teacherId) continue;
      const teacher = await this.prisma.teacherProfile.findFirst({
        where: { id: teacherId, institutionId, status: TeacherStatus.APPROVED },
        include: { user: true },
      });
      if (!teacher) {
        throw new BadRequestException(
          'Examiner must be an approved centre examiner',
        );
      }
      if (
        teacherId === dto.writingTeacherId &&
        !teacherCanAccessWriting(teacher.speciality)
      ) {
        throw new BadRequestException(
          'Selected examiner cannot grade Writing',
        );
      }
      if (
        teacherId === dto.speakingTeacherId &&
        !teacherCanAccessSpeaking(teacher.speciality)
      ) {
        throw new BadRequestException(
          'Selected examiner cannot grade Speaking',
        );
      }
    }

    const writingAttempt = enrollment.examSession?.sectionAttempts.find(
      (a) => a.skill === ExamSkill.WRITING,
    );
    const speakingAttempt = enrollment.examSession?.sectionAttempts.find(
      (a) => a.skill === ExamSkill.SPEAKING,
    );

    const speakingTeacherChanged =
      Boolean(dto.speakingTeacherId) &&
      dto.speakingTeacherId !== enrollment.speakingTeacherId;

    await this.prisma.$transaction(async (tx) => {
      let nextSpeakingSlotId = enrollment.speakingSlotId;

      if (speakingTeacherChanged && dto.speakingTeacherId) {
        const scheduledAt =
          enrollment.speakingSlot?.startsAt ??
          speakingAttempt?.speakingSession?.scheduledAt ??
          null;

        if (scheduledAt) {
          nextSpeakingSlotId = await this.transferSpeakingSlot(tx, {
            oldSlotId: enrollment.speakingSlotId,
            newTeacherId: dto.speakingTeacherId,
            startsAt: scheduledAt,
            endsAt:
              enrollment.speakingSlot?.endsAt ??
              new Date(
                scheduledAt.getTime() +
                  SPEAKING_SLOT_DURATION_MINUTES * 60_000,
              ),
          });
        }
      }

      await tx.enrollment.update({
        where: { id: enrollmentId },
        data: {
          ...(dto.writingTeacherId
            ? { writingTeacherId: dto.writingTeacherId }
            : {}),
          ...(dto.speakingTeacherId
            ? {
                speakingTeacherId: dto.speakingTeacherId,
                speakingSlotId: nextSpeakingSlotId,
              }
            : {}),
        },
      });

      if (dto.writingTeacherId && writingAttempt?.writingSubmission) {
        await tx.writingSubmission.update({
          where: { id: writingAttempt.writingSubmission.id },
          data: {
            teacherId: dto.writingTeacherId,
            slaDueAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
          },
        });
      }

      if (dto.speakingTeacherId && speakingAttempt?.speakingSession) {
        await tx.speakingSession.update({
          where: { id: speakingAttempt.speakingSession.id },
          data: {
            teacherId: dto.speakingTeacherId,
            ...(enrollment.speakingSlot?.startsAt ||
            speakingAttempt.speakingSession.scheduledAt
              ? {
                  scheduledAt:
                    enrollment.speakingSlot?.startsAt ??
                    speakingAttempt.speakingSession.scheduledAt,
                }
              : {}),
          },
        });
      }
    });

    if (dto.writingTeacherId) {
      const teacher = await this.prisma.teacherProfile.findUnique({
        where: { id: dto.writingTeacherId },
      });
      if (teacher) {
        await this.notifications.create(
          teacher.userId,
          'Writing submission assigned',
          'You have been assigned a writing submission to grade.',
          NotificationType.GRADING,
          examinerWritingGradingHubPath(teacher.institutionId),
        );
      }
    }

    if (dto.speakingTeacherId) {
      const teacher = await this.prisma.teacherProfile.findUnique({
        where: { id: dto.speakingTeacherId },
      });
      if (teacher) {
        await this.notifications.create(
          teacher.userId,
          'Speaking session assigned',
          'You have been assigned as speaking examiner for a centre mock.',
          NotificationType.GRADING,
          examinerSpeakingPath(teacher.institutionId),
        );
      }
    }

    await this.audit.log({
      userId: user.id,
      action: AuditAction.INSTITUTION_EXAMINER_REASSIGN,
      entity: 'enrollment',
      entityId: enrollmentId,
      metadata: {
        writingTeacherId: dto.writingTeacherId ?? null,
        speakingTeacherId: dto.speakingTeacherId ?? null,
        speakingSlotTransferred: speakingTeacherChanged,
      },
    });

    return { reassigned: true };
  }

  /**
   * Release the old examiner's booked slot and book (or create) the same
   * wall-clock slot for the new examiner. Throws on BOOKED/BLOCKED conflict.
   */
  private async transferSpeakingSlot(
    tx: Prisma.TransactionClient,
    params: {
      oldSlotId: string | null;
      newTeacherId: string;
      startsAt: Date;
      endsAt: Date;
    },
  ): Promise<string> {
    const { oldSlotId, newTeacherId, startsAt, endsAt } = params;

    const existing = await tx.teacherSlot.findUnique({
      where: {
        teacherId_startsAt: { teacherId: newTeacherId, startsAt },
      },
    });

    if (existing) {
      if (existing.id === oldSlotId) {
        return existing.id;
      }
      if (existing.status === SlotStatus.BOOKED) {
        throw new BadRequestException(
          'This speaking examiner is already booked at that time. Choose a different examiner or cancel and re-enrol.',
        );
      }
      if (existing.status === SlotStatus.BLOCKED) {
        throw new BadRequestException(
          'That speaking time is blocked for the selected examiner. Choose a different examiner.',
        );
      }

      const booked = await tx.teacherSlot.updateMany({
        where: { id: existing.id, status: SlotStatus.AVAILABLE },
        data: { status: SlotStatus.BOOKED, version: { increment: 1 } },
      });
      if (booked.count === 0) {
        throw new BadRequestException(
          'This speaking examiner is already booked at that time. Choose a different examiner or cancel and re-enrol.',
        );
      }

      if (oldSlotId) {
        await tx.teacherSlot.updateMany({
          where: { id: oldSlotId, status: SlotStatus.BOOKED },
          data: { status: SlotStatus.AVAILABLE, version: { increment: 1 } },
        });
      }
      return existing.id;
    }

    const created = await tx.teacherSlot.create({
      data: {
        teacherId: newTeacherId,
        startsAt,
        endsAt,
        status: SlotStatus.BOOKED,
      },
    });

    if (oldSlotId) {
      await tx.teacherSlot.updateMany({
        where: { id: oldSlotId, status: SlotStatus.BOOKED },
        data: { status: SlotStatus.AVAILABLE, version: { increment: 1 } },
      });
    }

    return created.id;
  }

  // ─── Cohort report ───────────────────────────────────────────────────────

  async getCohortReport(user: RequestUser, range?: string) {
    const institutionId = requireInstitutionId(user);
    const months = range === '3m' ? 3 : range === 'all' ? 60 : 6;
    const since = new Date();
    since.setMonth(since.getMonth() - months);

    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        institutionId,
        resultsStatus: ResultsStatus.RELEASED,
        updatedAt: { gte: since },
      },
      include: enrollmentInclude,
      orderBy: { updatedAt: 'asc' },
    });

    const overalls: number[] = [];
    const skillTotals = { listening: [0, 0], reading: [0, 0], writing: [0, 0], speaking: [0, 0] };
    const distribution = new Map<number, number>();
    const trendByMonth = new Map<string, { sum: number; count: number }>();
    const byStudent = new Map<
      string,
      { name: string; bands: number[]; mocks: number; target: number | null }
    >();

    for (const e of enrollments) {
      const overall = this.overallBand(e);
      if (overall == null) continue;
      overalls.push(overall);

      const bucket = Math.round(overall * 2) / 2;
      distribution.set(bucket, (distribution.get(bucket) ?? 0) + 1);

      const monthKey = e.updatedAt.toISOString().slice(0, 7);
      const cur = trendByMonth.get(monthKey) ?? { sum: 0, count: 0 };
      cur.sum += overall;
      cur.count += 1;
      trendByMonth.set(monthKey, cur);

      for (const attempt of e.examSession?.sectionAttempts ?? []) {
        const band =
          attempt.skill === 'WRITING'
            ? attempt.writingSubmission?.grade?.overallBand ?? attempt.band
            : attempt.skill === 'SPEAKING'
              ? attempt.speakingSession?.grade?.overallBand ?? attempt.band
              : attempt.band;
        if (band == null) continue;
        const key = attempt.skill.toLowerCase() as keyof typeof skillTotals;
        if (skillTotals[key]) {
          skillTotals[key][0] += band;
          skillTotals[key][1] += 1;
        }
      }

      const sid = e.student.id;
      const rec = byStudent.get(sid) ?? {
        name: e.student.user.name,
        bands: [],
        mocks: 0,
        target: e.student.targetBand ?? null,
      };
      rec.bands.push(overall);
      rec.mocks += 1;
      byStudent.set(sid, rec);
    }

    const avg = (arr: number[]) =>
      arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null;
    const skillAvg = (pair: number[]) =>
      pair[1] ? Math.round((pair[0] / pair[1]) * 10) / 10 : null;

    const topPerformers = [...byStudent.values()]
      .map((r) => {
        const start = r.bands[0]!;
        const latest = r.bands[r.bands.length - 1]!;
        return {
          name: r.name,
          startBand: start,
          latestBand: latest,
          improvement: Math.round((latest - start) * 10) / 10,
          mocks: r.mocks,
        };
      })
      .sort((a, b) => b.improvement - a.improvement)
      .slice(0, 8);

    const avgImprovement = topPerformers.length
      ? Math.round(
          (topPerformers.reduce((a, r) => a + r.improvement, 0) / topPerformers.length) * 10,
        ) / 10
      : null;

    const distributionRows = [5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9].map((band) => ({
      band,
      count: distribution.get(band) ?? 0,
    }));

    const trend = [...trendByMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({
        month,
        avgBand: Math.round((v.sum / v.count) * 10) / 10,
      }));

    return {
      summary: {
        studentsTested: byStudent.size,
        avgOverallBand: avg(overalls),
        avgImprovement,
        mocksDelivered: enrollments.length,
      },
      bandDistribution: distributionRows,
      trend,
      skillAverages: {
        listening: skillAvg(skillTotals.listening),
        reading: skillAvg(skillTotals.reading),
        writing: skillAvg(skillTotals.writing),
        speaking: skillAvg(skillTotals.speaking),
      },
      topPerformers,
    };
  }

  // ─── Profile ─────────────────────────────────────────────────────────────

  async getProfile(user: RequestUser) {
    const institution = await this.getInstitutionOrThrow(user);
    const botUsername = this.config
      .get<string>('TELEGRAM_BOT_USERNAME', '')
      .trim()
      .replace(/^https?:\/\/t\.me\//i, '')
      .replace(/^t\.me\//i, '')
      .replace(/^@/, '')
      .replace(/\/+$/, '');
    return {
      id: institution.id,
      name: institution.name,
      slug: institution.slug,
      status: institution.status.toLowerCase(),
      city: institution.city,
      address: institution.address,
      logoUrl: institution.logoUrl,
      /** Marketing-site approval only; portal uses logoUrl immediately. */
      marketingLogoStatus: institution.marketingLogoStatus.toLowerCase(),
      marketingLogoReviewNote: institution.marketingLogoReviewNote,
      bio: institution.bio,
      contactName: institution.contactName,
      contactEmail: institution.contactEmail,
      contactPhone: institution.contactPhone,
      wholesalePrice: institution.wholesalePrice,
      currency: institution.currency,
      creditBalance: institution.creditBalance,
      joinDeepLink: botUsername
        ? `https://t.me/${botUsername}?start=inst_${institution.id}`
        : null,
      publicPageUrl: `${this.appUrl()}/centers/${institution.slug}`,
    };
  }

  async updateProfile(user: RequestUser, dto: UpdateInstitutionProfileDto) {
    const institution = await this.getInstitutionOrThrow(user);
    const logoChanging =
      dto.logoUrl !== undefined && dto.logoUrl !== institution.logoUrl;
    await this.prisma.institution.update({
      where: { id: institution.id },
      data: {
        name: dto.name ?? undefined,
        city: dto.city ?? undefined,
        address: dto.address ?? undefined,
        bio: dto.bio ?? undefined,
        contactName: dto.contactName ?? undefined,
        contactEmail: dto.contactEmail ?? undefined,
        contactPhone: dto.contactPhone ?? undefined,
        logoUrl: dto.logoUrl ?? undefined,
        ...(logoChanging
          ? {
              marketingLogoStatus: dto.logoUrl
                ? MarketingLogoStatus.PENDING
                : MarketingLogoStatus.NONE,
              marketingLogoReviewedAt: null,
              marketingLogoReviewNote: null,
            }
          : {}),
      },
    });

    await this.audit.log({
      userId: user.id,
      action: AuditAction.INSTITUTION_PROFILE_UPDATE,
      entity: 'institution',
      entityId: institution.id,
    });

    return this.getProfile(user);
  }

  async uploadLogo(user: RequestUser, file?: Express.Multer.File) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('No file uploaded.');
    }
    const EXT_BY_MIME: Record<string, string> = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/webp': 'webp',
      'image/svg+xml': 'svg',
    };
    const ext = EXT_BY_MIME[file.mimetype];
    if (!ext) {
      throw new BadRequestException(
        'Logo must be a PNG, JPG, WebP or SVG image.',
      );
    }

    const institution = await this.getInstitutionOrThrow(user);

    // Remove the previous locally-stored logo so we don't orphan files.
    if (institution.logoUrl) {
      const prev = this.storage.relativePathFromPublicUrl(institution.logoUrl);
      if (prev) await this.storage.deleteFile(prev);
    }

    const relativePath = `institutions/${institution.id}-${randomBytes(6).toString('hex')}.${ext}`;
    const logoUrl = await this.storage.saveBuffer(relativePath, file.buffer);

    // Portal may show logoUrl immediately; marketing waits for platform approval.
    await this.prisma.institution.update({
      where: { id: institution.id },
      data: {
        logoUrl,
        marketingLogoStatus: MarketingLogoStatus.PENDING,
        marketingLogoReviewedAt: null,
        marketingLogoReviewNote: null,
      },
    });

    await this.audit.log({
      userId: user.id,
      action: AuditAction.INSTITUTION_PROFILE_UPDATE,
      entity: 'institution',
      entityId: institution.id,
      metadata: { marketingLogoStatus: MarketingLogoStatus.PENDING },
    });

    return this.getProfile(user);
  }

  // ─── Centre support requests (from students & examiners) ─────────────────

  async listSupportRequests(user: RequestUser) {
    const institutionId = requireInstitutionId(user);
    const tickets = await this.prisma.supportTicket.findMany({
      where: { institutionId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        user: { select: { id: true, name: true, role: true } },
        enrollment: {
          select: {
            enrollmentCode: true,
            package: { select: { title: true } },
          },
        },
      },
    });

    return tickets.map((t) => ({
      id: t.id,
      ticketId: t.ticketCode,
      subject: t.subject,
      message: t.description.startsWith('Related:')
        ? t.description.split('\n\n').slice(1).join('\n\n').trim()
        : t.description.trim(),
      type: t.type.toLowerCase(),
      priority: t.priority.toLowerCase(),
      status: t.status.toLowerCase(),
      reporter: t.user
        ? {
            name: t.user.name,
            role: t.user.role.toLowerCase(),
          }
        : null,
      relatedRef: t.description.startsWith('Related:')
        ? t.description.split('\n')[0]?.replace(/^Related:\s*/i, '').trim() ??
          null
        : t.enrollment
          ? `${t.enrollment.enrollmentCode} · ${t.enrollment.package.title}`
          : null,
      createdAt: t.createdAt,
      resolvedAt: t.resolvedAt,
    }));
  }

  async updateSupportRequest(
    user: RequestUser,
    ticketId: string,
    dto: UpdateInstitutionSupportTicketDto,
  ) {
    const institutionId = requireInstitutionId(user);
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id: ticketId, institutionId },
      include: {
        user: {
          select: {
            id: true,
            role: true,
            studentProfile: { select: { institutionId: true } },
            teacherProfile: { select: { institutionId: true } },
          },
        },
      },
    });
    if (!ticket) {
      throw new NotFoundException('Request not found');
    }

    const resolving =
      dto.status === 'RESOLVED' || dto.status === 'CLOSED';
    const updated = await this.prisma.supportTicket.update({
      where: { id: ticket.id },
      data: {
        status: dto.status,
        resolvedAt: resolving ? new Date() : null,
        slaState: resolving ? 'ON_TRACK' : undefined,
        slaProgress: resolving ? 100 : undefined,
      },
    });

    if (resolving && ticket.user) {
      const centreMember = true;
      const helpPath = helpPathForReporter(ticket.user.role, centreMember);
      await this.notifications.create(
        ticket.user.id,
        'Centre request resolved',
        `${ticket.ticketCode} (“${ticket.subject}”) has been resolved by your centre.`,
        NotificationType.INFO,
        helpPath,
      );
    }

    await this.audit.log({
      userId: user.id,
      action: AuditAction.INSTITUTION_SUPPORT_TICKET_UPDATE,
      entity: 'support_ticket',
      entityId: ticket.id,
      metadata: { status: dto.status },
    });

    return {
      id: updated.id,
      ticketId: updated.ticketCode,
      status: updated.status.toLowerCase(),
    };
  }
}
