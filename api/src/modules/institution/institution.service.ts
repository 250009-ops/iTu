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
  InstitutionMemberStatus,
  NotificationType,
  OrderStatus,
  OrderType,
  Prisma,
  ResultsStatus,
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
import { requireInstitutionId } from '../../common/institution/institution-scope';
import { MailService } from '../../common/mail/mail.service';
import { RequestUser } from '../../common/types/request-user';
import { PrismaService } from '../../prisma/prisma.service';
import { BookingsService } from '../bookings/bookings.service';
import { LemonSqueezyService } from '../payments/lemon-squeezy.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateCreditCheckoutDto } from './dto/create-credit-checkout.dto';
import { EnrollStudentsDto } from './dto/enroll-students.dto';
import { InviteExaminerDto } from './dto/invite-examiner.dto';
import { UpdateInstitutionProfileDto } from './dto/update-institution-profile.dto';

const SETUP_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

/** Sections done (submitted) per skill for the L/R/W/S progress dots. */
type SectionProgress = {
  listening: boolean;
  reading: boolean;
  writing: boolean;
  speaking: boolean;
};

const enrollmentInclude = {
  student: { include: { user: { select: { name: true, email: true } } } },
  package: { select: { title: true, packageKind: true } },
  writingTeacher: { include: { user: { select: { name: true } } } },
  speakingTeacher: { include: { user: { select: { name: true } } } },
  examSession: {
    select: {
      sectionAttempts: {
        select: {
          skill: true,
          band: true,
          submittedAt: true,
          writingSubmission: { select: { grade: { select: { overallBand: true } } } },
          speakingSession: { select: { grade: { select: { overallBand: true } } } },
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
    private lemon: LemonSqueezyService,
    private mail: MailService,
    private audit: AuditService,
    private notifications: NotificationsService,
    private config: ConfigService,
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

    const [activeStudents, pendingStudents, upcoming, recent] = await Promise.all([
      this.prisma.studentProfile.count({
        where: { institutionId, institutionStatus: InstitutionMemberStatus.ACTIVE },
      }),
      this.prisma.studentProfile.count({
        where: { institutionId, institutionStatus: InstitutionMemberStatus.PENDING },
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

    return {
      centerName: institution.name,
      creditBalance: institution.creditBalance,
      wholesalePrice: institution.wholesalePrice,
      currency: institution.currency,
      activeStudents,
      pendingStudents,
      upcomingMocksCount: upcomingCount,
      avgCohortBand,
      upcomingMocks: upcoming.map((e) => this.mapEnrollmentRow(e)),
      recentResults: recent.map((e) => ({
        id: e.id,
        studentName: e.student.user.name,
        overallBand: this.overallBand(e),
        targetBand: e.student.targetBand ?? null,
        date: e.updatedAt,
      })),
    };
  }

  private mapEnrollmentRow(e: EnrollmentWithRelations) {
    return {
      id: e.id,
      enrollmentCode: e.enrollmentCode,
      studentName: e.student.user.name,
      packageTitle: e.package.title,
      mockDate: e.mockDate,
      mockTime: e.mockTime,
      status: e.status.toLowerCase(),
      examiner:
        e.writingTeacher?.user.name ?? e.speakingTeacher?.user.name ?? null,
      progress: this.sectionProgress(e),
      overallBand: this.overallBand(e),
      resultsStatus: e.resultsStatus.toLowerCase(),
    };
  }

  // ─── Credits ─────────────────────────────────────────────────────────────

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

    if (!this.lemon.isConfigured()) {
      throw new BadRequestException(
        'Online payment is not configured. Contact the platform to top up credits.',
      );
    }

    const variantId = this.lemon.resolveVariantId(pack.variantKey);
    if (!variantId) {
      throw new BadRequestException(
        'This credit pack is not available for checkout yet.',
      );
    }

    const checkout = await this.lemon.createCheckout({
      orderId: order.id,
      orderCode: order.orderCode,
      email: institution.contactEmail,
      name: institution.name,
      amount,
      currency: institution.currency,
      packageTitle: `${pack.credits} mock credits`,
      variantId,
    });

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        lemonCheckoutId: checkout.checkoutId,
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

  // ─── Enroll (spend credits) ──────────────────────────────────────────────

  async enrollStudents(user: RequestUser, dto: EnrollStudentsDto) {
    const institution = await this.getInstitutionOrThrow(user);
    const institutionId = institution.id;

    if (dto.studentIds.length > institution.creditBalance) {
      throw new BadRequestException(
        `Not enough credits: need ${dto.studentIds.length}, have ${institution.creditBalance}.`,
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

    const results: { studentId: string; enrollmentCode?: string; error?: string }[] =
      [];

    for (const studentId of dto.studentIds) {
      const student = await this.loadInstitutionStudent(institutionId, studentId);
      if (student.institutionStatus !== InstitutionMemberStatus.ACTIVE) {
        results.push({ studentId, error: 'Student is not approved' });
        continue;
      }

      // Atomically reserve one credit.
      const reserved = await this.prisma.institution.updateMany({
        where: { id: institutionId, creditBalance: { gte: 1 } },
        data: { creditBalance: { decrement: 1 } },
      });
      if (reserved.count === 0) {
        results.push({ studentId, error: 'Insufficient credits' });
        break;
      }

      try {
        const enrollment = await this.bookings.provisionEnrollment({
          studentProfileId: student.id,
          actorUserId: user.id,
          packageId: dto.packageId,
          mockDate: dto.mockDate,
          writingTeacherId: dto.writingTeacherId,
          speakingTeacherId: dto.speakingTeacherId,
          institutionId,
          institutionGranted: true,
          auditAction: AuditAction.INSTITUTION_ENROLL,
        });

        const fresh = await this.prisma.institution.findUnique({
          where: { id: institutionId },
          select: { creditBalance: true },
        });
        await this.prisma.institutionCreditTxn.create({
          data: {
            institutionId,
            type: CreditTxnType.CONSUME,
            delta: -1,
            balanceAfter: fresh?.creditBalance ?? 0,
            enrollmentId: enrollment.enrollmentId,
            reference: enrollment.enrollmentCode,
            note: `Enrolled ${student.user.name}`,
          },
        });
        results.push({ studentId, enrollmentCode: enrollment.enrollmentCode });
      } catch (err) {
        // Compensate: return the reserved credit.
        await this.prisma.institution.update({
          where: { id: institutionId },
          data: { creditBalance: { increment: 1 } },
        });
        const message = err instanceof Error ? err.message : 'Enrollment failed';
        results.push({ studentId, error: message });
      }
    }

    const fresh = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      select: { creditBalance: true },
    });

    return {
      enrolled: results.filter((r) => r.enrollmentCode).length,
      failed: results.filter((r) => r.error),
      creditBalance: fresh?.creditBalance ?? 0,
    };
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

  // ─── Enrollments pipeline ────────────────────────────────────────────────

  async listEnrollments(user: RequestUser) {
    const institutionId = requireInstitutionId(user);
    const enrollments = await this.prisma.enrollment.findMany({
      where: { institutionId },
      include: enrollmentInclude,
      orderBy: { mockDate: 'desc' },
    });

    const rows = enrollments.map((e) => this.mapEnrollmentRow(e));
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
}
