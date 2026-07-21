import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import {
  EnrollmentStatus,
  ExamSessionState,
  ExamSkill,
  NotificationType,
  OrderStatus,
  PaymentMethod,
  Prisma,
  SlotStatus,
} from '@prisma/client';
import { RequestUser } from '../../common/types/request-user';
import { mockStartDateTime } from '../../common/band-resolution';
import {
  calendarDateIsoInTimeZone,
  extractCalendarDateIso,
  hasExamStarted,
  isFlexibleGrant,
  addCalendarDaysIso,
  resolveMockDayCutoffAt,
  zonedWallClockToUtc,
} from '../../common/mock-day-policy';
import {
  AuditAction,
  type AuditActionName,
} from '../../common/audit/audit.actions';
import { AuditService } from '../../common/audit/audit.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  examinerSpeakingPath,
  examinerWritingGradingHubPath,
} from '../../common/examiner/examiner-routing';
import { CreateBookingDto } from './dto/create-booking.dto';
import { RescheduleBookingDto } from './dto/reschedule-booking.dto';
import { ScheduleSpeakingSlotDto } from './dto/schedule-speaking-slot.dto';
import { ReappointEnrollmentDto } from '../admin/dto/reappoint-enrollment.dto';
import { UpdateGrantEnrollmentDto } from '../admin/dto/update-grant-enrollment.dto';
import { SettingsService } from '../settings/settings.service';
import { UzumCheckoutService } from '../payments/uzum-checkout.service';
import {
  assignContentTests,
  evaluatePackageAvailability,
} from '../content/content-assignment';
import { packageExamSkills } from '../content/package-skills';
import { teacherSpecialityWhere } from '../../common/teacher-speciality';
import {
  welcomePromoClaimField,
  type WelcomePromoSkill,
} from '../../common/welcome-promo';

/**
 * Parameters for {@link BookingsService.provisionEnrollment}. Shared by the
 * student self-checkout flow and the admin complimentary-grant flow.
 */
export interface ProvisionEnrollmentParams {
  /** StudentProfile id the enrollment is created for. */
  studentProfileId: string;
  /** User id performing the action (student or admin) — used for the audit log. */
  actorUserId: string;
  packageId: string;
  mockDate: string;
  /** Required for paid bookings; omit for flexible admin grants. */
  mockTime?: string | null;
  mockDayCutoffTime?: string;
  writingTeacherId?: string;
  speakingTeacherId?: string;
  speakingSlotId?: string;
  /**
   * When set without speakingSlotId, create an AVAILABLE one-off TeacherSlot at
   * mockDate + speakingTime (HH:mm) for the speaking examiner, then book it.
   * Used by institution enrolments where centre examiners may lack weekly slots.
   */
  speakingTime?: string;
  /** When reappointing a missed mock, link to the prior enrollment. */
  reappointmentOfId?: string;
  /** When true: $0 order, COMPLIMENTARY payment method, adminGranted enrollment. */
  complimentary?: boolean;
  /** When true: $0 welcome promo enrollment — separate from admin grants. */
  welcomePromo?: boolean;
  /** Reappointment of a paid mock — no charge, not flagged adminGranted. */
  isReappointment?: boolean;
  /** When set: enrollment belongs to an institution (credit-funded, off-platform pay). */
  institutionId?: string;
  /** When true: $0 order, institution-funded enrollment (credit already spent). */
  institutionGranted?: boolean;
  auditAction: AuditActionName;
  /** Only used for paid bookings; ignored when {@link complimentary} is true. */
  paymentMethod?: string;
}

@Injectable()
export class BookingsService {
  private static readonly CHECKOUT_HOLD_MINUTES = 15;

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private audit: AuditService,
    private settings: SettingsService,
    @Inject(forwardRef(() => UzumCheckoutService))
    private uzum: UzumCheckoutService,
  ) {}

  async getAvailability(date: string, teacherId?: string) {
    const match = date.match(/^(\d{4}-\d{2}-\d{2})/);
    if (!match) {
      throw new BadRequestException('date must be YYYY-MM-DD');
    }
    const dateIso = match[1]!;
    const timeZone = await this.settings.getPlatformTimezone();
    const now = new Date();
    const dayStart = zonedWallClockToUtc(dateIso, 0, 0, 0, timeZone);
    const dayEnd = zonedWallClockToUtc(dateIso, 23, 59, 59, timeZone);
    const minStart = new Date(Math.max(dayStart.getTime(), now.getTime()));

    const slots = await this.prisma.teacherSlot.findMany({
      where: {
        startsAt: { gte: minStart, lte: dayEnd },
        ...(teacherId ? { teacherId } : {}),
        status: SlotStatus.AVAILABLE,
      },
      include: {
        teacher: { include: { user: { select: { name: true } } } },
      },
      orderBy: { startsAt: 'asc' },
    });

    return slots.map((s) => ({
      id: s.id,
      teacherId: s.teacherId,
      teacherName: s.teacher.user.name,
      startsAt: s.startsAt,
      endsAt: s.endsAt,
      status: s.status.toLowerCase(),
    }));
  }

  async listTeachers(speciality?: 'writing' | 'speaking' | 'both') {
    const teachers = await this.prisma.teacherProfile.findMany({
      where: {
        status: 'APPROVED',
        institutionId: null,
        ...teacherSpecialityWhere(speciality),
      },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { rating: 'desc' },
    });

    return teachers.map((t) => ({
      id: t.id,
      name: t.user.name,
      email: t.user.email,
      speciality: t.speciality.toLowerCase(),
      rating: t.rating,
      status: t.status.toLowerCase(),
    }));
  }

  async createBooking(dto: CreateBookingDto, user: RequestUser) {
    if (!user.studentProfileId) {
      throw new ForbiddenException('Only students can create bookings');
    }

    const params = {
      studentProfileId: user.studentProfileId,
      actorUserId: user.id,
      packageId: dto.packageId,
      mockDate: dto.mockDate,
      mockTime: dto.mockTime,
      writingTeacherId: dto.writingTeacherId,
      speakingTeacherId: dto.speakingTeacherId,
      speakingSlotId: dto.speakingSlotId,
      paymentMethod: dto.paymentMethod,
      auditAction: AuditAction.BOOKING_CREATE,
    };

    if (this.uzum.isConfigured()) {
      const pkg = await this.prisma.mockTestPackage.findUnique({
        where: { id: dto.packageId },
      });
      if (!pkg) throw new NotFoundException('Package not found');
      return this.initiatePaidCheckout(params, user, pkg);
    }

    return this.provisionEnrollment(params);
  }

  /**
   * Shared enrollment provisioning used by both student self-checkout and admin
   * complimentary grants. Creates the enrollment, order, exam session, section
   * attempts and (for speaking packages) the scheduled speaking session inside a
   * single transaction, then fires notifications and writes an audit entry.
   *
   * When `complimentary` is true the order is recorded as a $0
   * COMPLIMENTARY payment and the enrollment is flagged `adminGranted`, while
   * still respecting content-availability and speaking-slot locking exactly like
   * a paid booking.
   */
  async provisionEnrollment(params: ProvisionEnrollmentParams) {
    const { studentProfileId, actorUserId, auditAction } = params;
    const complimentary = params.complimentary ?? false;
    const welcomePromo = params.welcomePromo ?? false;
    const institutionGranted = params.institutionGranted ?? false;
    const zeroCharge = complimentary || institutionGranted || welcomePromo;

    const pkg = await this.prisma.mockTestPackage.findUnique({
      where: { id: params.packageId },
    });
    if (!pkg || !pkg.isActive) {
      throw new NotFoundException('Package not found');
    }

    const skills = this.packageSkills(pkg);
    const needsWriting = skills.includes('writing');
    const needsSpeaking = skills.includes('speaking');

    if (needsWriting && !params.writingTeacherId) {
      throw new BadRequestException('Writing examiner is required for this package');
    }

    // Flexible start (no mockTime) stays allowed for zero-charge enrollments.
    // Speaking-slot deferral is only for platform admin/welcome grants — centre
    // enrollments must set the speaking time at enroll time.
    const flexibleStart = zeroCharge && !params.mockTime;
    const canDeferSpeakingSlot =
      (complimentary || welcomePromo) && !institutionGranted;
    if (complimentary && !params.reappointmentOfId && !welcomePromo) {
      await this.assertNoActiveAdminGrant(studentProfileId);
    }
    if (needsSpeaking && !params.speakingTeacherId) {
      throw new BadRequestException(
        'Speaking examiner is required for this package',
      );
    }
    if (
      needsSpeaking &&
      !canDeferSpeakingSlot &&
      !params.speakingSlotId &&
      !params.speakingTime
    ) {
      throw new BadRequestException(
        'Speaking slot is required for this package',
      );
    }
    if (!needsWriting && params.writingTeacherId) {
      throw new BadRequestException(
        'Writing examiner is not required for this package',
      );
    }
    if (
      !needsSpeaking &&
      (params.speakingTeacherId || params.speakingSlotId || params.speakingTime)
    ) {
      throw new BadRequestException(
        'Speaking slot is not required for this package',
      );
    }

    const timeZone = await this.settings.getPlatformTimezone();
    const mockDayTimers = await this.settings.getMockDayTimers();
    const cutoffTime =
      params.mockDayCutoffTime ?? mockDayTimers.dayCutoffTime;
    let mockDayCutoffAt: Date;
    try {
      mockDayCutoffAt = resolveMockDayCutoffAt(
        params.mockDate,
        cutoffTime,
        timeZone,
      );
    } catch (err) {
      throw new BadRequestException(
        err instanceof Error ? err.message : 'Invalid mock day cutoff',
      );
    }

    const resolvedMockTime = params.mockTime ?? null;
    if (!flexibleStart) {
      if (!resolvedMockTime || !/^\d{2}:\d{2}$/.test(resolvedMockTime)) {
        throw new BadRequestException('mockTime must be in HH:mm format');
      }
      const mockStart = mockStartDateTime(
        new Date(params.mockDate),
        resolvedMockTime,
      );
      if (mockStart.getTime() <= Date.now()) {
        throw new BadRequestException('Mock date and time must be in the future');
      }
      if (mockStart.getTime() > mockDayCutoffAt.getTime()) {
        throw new BadRequestException(
          'Mock start time must be before the day cutoff',
        );
      }
    }

    const availability = await evaluatePackageAvailability(
      this.prisma,
      studentProfileId,
      pkg,
    );
    if (!params.reappointmentOfId && !availability.canPurchase) {
      throw new BadRequestException(
        availability.blockingReason ??
          (complimentary
            ? 'This student cannot be enrolled in this package with their current test history.'
            : 'You cannot purchase this package with your current test history.'),
      );
    }

    const enrollmentCode = await this.generateCode('ENR');
    const orderCode = await this.generateCode('ORD');
    const sessionCode = await this.generateCode('MOCK');

    const amount =
      zeroCharge || params.isReappointment ? 0 : pkg.price;
    const paymentMethod =
      zeroCharge || params.isReappointment
        ? PaymentMethod.COMPLIMENTARY
        : ((params.paymentMethod?.toUpperCase() as PaymentMethod) ??
          PaymentMethod.CARD);

    const result = await this.prisma.$transaction(async (tx) => {
      let slot: { id: string; teacherId: string; startsAt: Date } | null =
        null;
      let speakingSlotId = params.speakingSlotId;

      if (needsSpeaking && !speakingSlotId && params.speakingTime) {
        if (!params.speakingTeacherId) {
          throw new BadRequestException(
            'Speaking examiner is required to create a speaking time',
          );
        }
        speakingSlotId = await this.createAdHocSpeakingSlot(tx, {
          teacherId: params.speakingTeacherId,
          mockDate: params.mockDate,
          speakingTime: params.speakingTime,
          timeZone,
        });
      }

      if (needsSpeaking && speakingSlotId) {
        const speakingSlot = await tx.teacherSlot.findUnique({
          where: { id: speakingSlotId },
        });
        if (!speakingSlot || speakingSlot.status !== SlotStatus.AVAILABLE) {
          throw new BadRequestException('Speaking slot is no longer available');
        }
        if (
          params.speakingTeacherId &&
          params.speakingTeacherId !== speakingSlot.teacherId
        ) {
          throw new BadRequestException(
            'Speaking examiner must match the selected slot',
          );
        }

        const booked = await tx.teacherSlot.updateMany({
          where: { id: speakingSlotId, status: SlotStatus.AVAILABLE },
          data: { status: SlotStatus.BOOKED, version: { increment: 1 } },
        });
        if (booked.count === 0) {
          throw new BadRequestException('Speaking slot booking conflict');
        }
        slot = speakingSlot;
      }

      const enrollment = await tx.enrollment.create({
        data: {
          enrollmentCode,
          studentId: studentProfileId,
          packageId: params.packageId,
          mockDate: new Date(params.mockDate),
          mockTime: resolvedMockTime,
          mockDayCutoffAt,
          status: EnrollmentStatus.ENROLLED,
          adminGranted: complimentary,
          welcomePromoGranted: welcomePromo,
          institutionId: params.institutionId ?? null,
          institutionGranted,
          reappointmentOfId: params.reappointmentOfId ?? null,
          writingTeacherId: params.writingTeacherId ?? null,
          speakingTeacherId:
            params.speakingTeacherId ?? slot?.teacherId ?? null,
          speakingSlotId: speakingSlotId ?? null,
        },
      });

      const order = await tx.order.create({
        data: {
          orderCode,
          studentId: studentProfileId,
          enrollmentId: enrollment.id,
          institutionId: params.institutionId ?? null,
          packageId: params.packageId,
          amount,
          currency: pkg.currency,
          paymentMethod,
          status: OrderStatus.PAID,
        },
      });

      const session = await tx.examSession.create({
        data: {
          sessionCode,
          enrollmentId: enrollment.id,
          state: ExamSessionState.ENROLLED,
        },
      });

      // Pin the single assigned test per skill for this package.
      const assignments = await assignContentTests(tx, studentProfileId, pkg);
      const testBySkill = new Map(
        assignments.map((a) => [a.skill, a.testId]),
      );

      for (const skill of skills) {
        const examSkill = skill.toUpperCase() as ExamSkill;
        if (!testBySkill.get(examSkill)) {
          throw new BadRequestException(
            `Package is missing a published ${skill} test`,
          );
        }
      }

      let speakingSession: { id: string } | null = null;

      for (const skill of skills) {
        const examSkill = skill.toUpperCase() as ExamSkill;
        const attempt = await tx.sectionAttempt.create({
          data: {
            sessionId: session.id,
            skill: examSkill,
            contentTestId: testBySkill.get(examSkill) ?? null,
          },
        });

        if (skill === 'speaking' && slot) {
          speakingSession = await tx.speakingSession.create({
            data: {
              sectionAttemptId: attempt.id,
              teacherId: slot.teacherId,
              status: 'SCHEDULED',
              scheduledAt: slot.startsAt,
            },
          });
        }
      }

      if (welcomePromo) {
        const skill: WelcomePromoSkill | null =
          pkg.packageKind === 'reading'
            ? 'reading'
            : pkg.packageKind === 'listening'
              ? 'listening'
              : null;
        if (!skill) {
          throw new BadRequestException(
            'Welcome promo only supports listening or reading packages',
          );
        }
        await tx.studentProfile.update({
          where: { id: studentProfileId },
          data: {
            [welcomePromoClaimField(skill)]: new Date(),
          },
        });
      }

      return { enrollment, order, session, slot, speakingSession };
    });

    const [writingTeacher, speakingTeacher, studentUser] = await Promise.all([
      params.writingTeacherId
        ? this.prisma.teacherProfile.findUnique({
            where: { id: params.writingTeacherId },
            include: { user: true },
          })
        : Promise.resolve(null),
      params.speakingTeacherId
        ? this.prisma.teacherProfile.findUnique({
            where: { id: params.speakingTeacherId },
            include: { user: true },
          })
        : Promise.resolve(null),
      this.prisma.user.findFirst({
        where: { studentProfile: { id: studentProfileId } },
      }),
    ]);

    if (studentUser) {
      const dateLabel = new Date(params.mockDate).toLocaleDateString();
      const cutoffLabel = mockDayCutoffAt.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      let body: string;
      let title: string;
      if (welcomePromo && flexibleStart) {
        const skillLabel =
          pkg.packageKind === 'reading' ? 'Reading' : 'Listening';
        title = 'Welcome gift claimed';
        body = `Your free ${skillLabel} mock is ready for ${dateLabel}. Start anytime before ${cutoffLabel} on that day.`;
      } else if (complimentary && flexibleStart) {
        title = 'Free mock granted';
        body = `An admin granted you a free mock on ${dateLabel}. Start anytime before ${cutoffLabel} on that day.`;
      } else if (params.isReappointment) {
        title = 'Mock reappointed';
        body = `Your mock has been reappointed for ${dateLabel}${resolvedMockTime ? ` at ${resolvedMockTime}` : ` — start before ${cutoffLabel}`}.`;
      } else if (complimentary) {
        title = 'Free mock granted';
        body = `An admin granted you a free mock on ${dateLabel} at ${resolvedMockTime}.`;
      } else if (institutionGranted) {
        title = 'Mock assigned by your centre';
        body = `Your centre enrolled you for a mock on ${dateLabel}. Start anytime before ${cutoffLabel}; speaking time is set by your centre.`;
      } else {
        title = 'Mock booked';
        body = `Your mock is confirmed for ${dateLabel} at ${resolvedMockTime}.`;
      }
      await this.notifications.create(
        studentUser.id,
        title,
        body,
        NotificationType.INFO,
        institutionGranted ? '/inst-student/my-mock' : '/student/mock-day',
      );
    }

    if (writingTeacher) {
      await this.notifications.create(
        writingTeacher.userId,
        'Writing submission incoming',
        `A new writing submission will be assigned after the student's exam.`,
        NotificationType.GRADING,
        examinerWritingGradingHubPath(writingTeacher.institutionId),
      );
    }

    if (speakingTeacher && result.slot && result.speakingSession) {
      await this.notifications.create(
        speakingTeacher.userId,
        'Speaking session scheduled',
        `Speaking session on ${result.slot.startsAt.toLocaleString()}.`,
        NotificationType.REMINDER,
        examinerSpeakingPath(
          speakingTeacher.institutionId,
          result.speakingSession.id,
        ),
      );
    }

    await this.audit.log({
      userId: actorUserId,
      action: auditAction,
      entity: 'enrollment',
      entityId: result.enrollment.id,
      metadata: {
        enrollmentCode: result.enrollment.enrollmentCode,
        orderCode: result.order.orderCode,
        sessionCode: result.session.sessionCode,
        packageId: params.packageId,
        complimentary,
        welcomePromo,
      },
    });

    return {
      enrollmentId: result.enrollment.id,
      enrollmentCode: result.enrollment.enrollmentCode,
      orderId: result.order.id,
      orderCode: result.order.orderCode,
      sessionCode: result.session.sessionCode,
      amount: result.order.amount,
      currency: result.order.currency,
      status:
        welcomePromo || complimentary ? 'granted' : 'confirmed',
    };
  }

  /** Complimentary admin grant still within the mock-day window and not started. */
  async findActiveAdminGrant(studentProfileId: string) {
    const now = new Date();
    const candidates = await this.prisma.enrollment.findMany({
      where: {
        studentId: studentProfileId,
        adminGranted: true,
        status: EnrollmentStatus.ENROLLED,
        examStartedAt: null,
        mockDayCutoffAt: { gt: now },
      },
      include: {
        package: { select: { id: true, title: true, skills: true } },
        writingTeacher: { include: { user: { select: { name: true } } } },
        speakingTeacher: { include: { user: { select: { name: true } } } },
        examSession: {
          include: {
            sectionAttempts: { select: { startedAt: true } },
          },
        },
      },
      orderBy: { mockDayCutoffAt: 'asc' },
    });

    return (
      candidates.find(
        (e) =>
          !hasExamStarted({
            checkInAt: e.examSession?.checkInAt ?? null,
            sectionAttempts: e.examSession?.sectionAttempts ?? [],
          }),
      ) ?? null
    );
  }

  private async assertNoActiveAdminGrant(studentProfileId: string) {
    const active = await this.findActiveAdminGrant(studentProfileId);
    if (active) {
      throw new BadRequestException(
        `Student already has an active complimentary mock (${active.enrollmentCode}). Edit or revoke it first.`,
      );
    }
  }

  async revokeAdminGrant(enrollmentId: string, actorUserId: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        order: true,
        examSession: {
          include: {
            sectionAttempts: { select: { startedAt: true } },
          },
        },
        student: { include: { user: true } },
      },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    if (!enrollment.adminGranted) {
      throw new BadRequestException('Only complimentary admin grants can be revoked');
    }
    if (enrollment.status !== EnrollmentStatus.ENROLLED) {
      throw new BadRequestException('Only active grants that have not finished can be revoked');
    }
    if (
      enrollment.examStartedAt ||
      hasExamStarted({
        checkInAt: enrollment.examSession?.checkInAt ?? null,
        sectionAttempts: enrollment.examSession?.sectionAttempts ?? [],
      })
    ) {
      throw new BadRequestException(
        'Cannot revoke a mock after the student has started',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      if (enrollment.speakingSlotId) {
        await tx.teacherSlot.updateMany({
          where: { id: enrollment.speakingSlotId },
          data: { status: SlotStatus.AVAILABLE, version: { increment: 1 } },
        });
      }

      await tx.enrollment.update({
        where: { id: enrollmentId },
        data: { status: EnrollmentStatus.CANCELLED },
      });

      if (enrollment.order) {
        await tx.order.update({
          where: { id: enrollment.order.id },
          data: { status: OrderStatus.REFUNDED },
        });
      }
    });

    await this.notifications.create(
      enrollment.student.userId,
      'Complimentary mock removed',
      `Your complimentary mock (${enrollment.enrollmentCode}) was removed by an administrator.`,
      NotificationType.INFO,
      '/student/mock-day',
    );

    await this.audit.log({
      userId: actorUserId,
      action: AuditAction.ADMIN_ENROLLMENT_GRANT_REVOKE,
      entity: 'enrollment',
      entityId: enrollmentId,
      metadata: { enrollmentCode: enrollment.enrollmentCode },
    });

    return { revoked: true, enrollmentCode: enrollment.enrollmentCode };
  }

  async updateAdminGrant(
    enrollmentId: string,
    dto: UpdateGrantEnrollmentDto,
    actorUserId: string,
  ) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        package: true,
        order: true,
        examSession: {
          include: {
            sectionAttempts: {
              include: { speakingSession: true, writingSubmission: true },
            },
          },
        },
        student: { include: { user: true } },
      },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    if (!enrollment.adminGranted) {
      throw new BadRequestException('Only complimentary admin grants can be edited');
    }
    if (enrollment.status !== EnrollmentStatus.ENROLLED) {
      throw new BadRequestException('Only active grants can be edited');
    }
    if (
      enrollment.examStartedAt ||
      hasExamStarted({
        checkInAt: enrollment.examSession?.checkInAt ?? null,
        sectionAttempts: enrollment.examSession?.sectionAttempts ?? [],
      })
    ) {
      throw new BadRequestException(
        'Cannot edit a mock after the student has started',
      );
    }

    const pkg = await this.prisma.mockTestPackage.findUnique({
      where: { id: dto.packageId },
    });
    if (!pkg || !pkg.isActive) {
      throw new NotFoundException('Package not found');
    }

    const skills = this.packageSkills(pkg);
    const needsWriting = skills.includes('writing');
    const needsSpeaking = skills.includes('speaking');

    if (needsWriting && !dto.writingTeacherId) {
      throw new BadRequestException('Writing examiner is required for this package');
    }
    if (needsSpeaking && !dto.speakingTeacherId) {
      throw new BadRequestException('Speaking examiner is required for this package');
    }
    if (!needsWriting && dto.writingTeacherId) {
      throw new BadRequestException('Writing examiner is not required for this package');
    }
    if (!needsSpeaking && dto.speakingTeacherId) {
      throw new BadRequestException('Speaking examiner is not required for this package');
    }

    const timeZone = await this.settings.getPlatformTimezone();
    const mockDayTimers = await this.settings.getMockDayTimers();
    const cutoffTime = dto.mockDayCutoffTime ?? mockDayTimers.dayCutoffTime;
    let mockDayCutoffAt: Date;
    try {
      mockDayCutoffAt = resolveMockDayCutoffAt(
        dto.mockDate,
        cutoffTime,
        timeZone,
      );
    } catch (err) {
      throw new BadRequestException(
        err instanceof Error ? err.message : 'Invalid mock day cutoff',
      );
    }

    const packageChanged = dto.packageId !== enrollment.packageId;
    if (packageChanged) {
      const availability = await evaluatePackageAvailability(
        this.prisma,
        enrollment.studentId,
        pkg,
        { exceptEnrollmentId: enrollmentId },
      );
      if (!availability.canPurchase) {
        throw new BadRequestException(
          availability.blockingReason ??
            'This student cannot be switched to the selected package.',
        );
      }
    }

    const session = enrollment.examSession;
    if (!session) {
      throw new BadRequestException('Enrollment is missing an exam session');
    }

    await this.prisma.$transaction(async (tx) => {
      if (packageChanged) {
        for (const attempt of session.sectionAttempts) {
          if (attempt.speakingSession) {
            await tx.speakingSession.delete({
              where: { id: attempt.speakingSession.id },
            });
          }
          await tx.sectionAttempt.delete({ where: { id: attempt.id } });
        }

        const assignments = await assignContentTests(tx, enrollment.studentId, pkg);
        const testBySkill = new Map(
          assignments.map((a) => [a.skill, a.testId]),
        );

        for (const skill of skills) {
          const examSkill = skill.toUpperCase() as ExamSkill;
          if (!testBySkill.get(examSkill)) {
            throw new BadRequestException(
              `Package is missing a published ${skill} test`,
            );
          }
        }

        for (const skill of skills) {
          const examSkill = skill.toUpperCase() as ExamSkill;
          await tx.sectionAttempt.create({
            data: {
              sessionId: session.id,
              skill: examSkill,
              contentTestId: testBySkill.get(examSkill) ?? null,
            },
          });
        }

        if (enrollment.order) {
          await tx.order.update({
            where: { id: enrollment.order.id },
            data: { packageId: dto.packageId },
          });
        }
      }

      const speakingTeacherChanged =
        dto.speakingTeacherId !== enrollment.speakingTeacherId;
      const writingTeacherChanged =
        dto.writingTeacherId !== enrollment.writingTeacherId;

      if (speakingTeacherChanged && enrollment.speakingSlotId) {
        await tx.teacherSlot.updateMany({
          where: { id: enrollment.speakingSlotId },
          data: { status: SlotStatus.AVAILABLE, version: { increment: 1 } },
        });
      }

      const speakingAttempt = session.sectionAttempts.find(
        (a) => a.skill === ExamSkill.SPEAKING,
      );
      if (speakingAttempt?.speakingSession && speakingTeacherChanged) {
        await tx.speakingSession.update({
          where: { id: speakingAttempt.speakingSession.id },
          data: {
            teacherId: dto.speakingTeacherId ?? null,
            scheduledAt: null,
            status: 'SCHEDULED',
            examinerReady: false,
          },
        });
      }

      if (writingTeacherChanged) {
        for (const attempt of session.sectionAttempts) {
          if (attempt.writingSubmission) {
            await tx.writingSubmission.update({
              where: { id: attempt.writingSubmission.id },
              data: { teacherId: dto.writingTeacherId ?? null },
            });
          }
        }
      }

      await tx.enrollment.update({
        where: { id: enrollmentId },
        data: {
          packageId: dto.packageId,
          mockDate: new Date(dto.mockDate),
          mockDayCutoffAt,
          writingTeacherId: dto.writingTeacherId ?? null,
          speakingTeacherId: dto.speakingTeacherId ?? null,
          speakingSlotId: speakingTeacherChanged ? null : enrollment.speakingSlotId,
        },
      });
    });

    const dateLabel = new Date(dto.mockDate).toLocaleDateString();
    const cutoffLabel = mockDayCutoffAt.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    await this.notifications.create(
      enrollment.student.userId,
      'Complimentary mock updated',
      `Your complimentary mock was updated — mock day ${dateLabel}, start before ${cutoffLabel}.`,
      NotificationType.INFO,
      '/student/mock-day',
    );

    await this.audit.log({
      userId: actorUserId,
      action: AuditAction.ADMIN_ENROLLMENT_GRANT_UPDATE,
      entity: 'enrollment',
      entityId: enrollmentId,
      metadata: {
        enrollmentCode: enrollment.enrollmentCode,
        packageId: dto.packageId,
        packageChanged,
      },
    });

    return {
      updated: true,
      enrollmentId,
      enrollmentCode: enrollment.enrollmentCode,
    };
  }

  async rescheduleBooking(
    enrollmentId: string,
    dto: RescheduleBookingDto,
    user: RequestUser,
  ) {
    if (!user.studentProfileId) {
      throw new ForbiddenException('Only students can reschedule bookings');
    }

    const enrollment = await this.prisma.enrollment.findFirst({
      where: { id: enrollmentId, studentId: user.studentProfileId },
      include: {
        package: true,
        examSession: {
          include: {
            sectionAttempts: { include: { speakingSession: true } },
          },
        },
      },
    });
    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }
    if (enrollment.status !== EnrollmentStatus.ENROLLED) {
      throw new BadRequestException(
        'Only upcoming mocks that have not started can be rescheduled',
      );
    }
    if (enrollment.examStartedAt || enrollment.examSession?.checkInAt) {
      throw new BadRequestException(
        'Mocks cannot be rescheduled after check-in has started',
      );
    }

    const timeZone = await this.settings.getPlatformTimezone();
    const mockDayTimers = await this.settings.getMockDayTimers();
    let mockDayCutoffAt: Date;
    try {
      mockDayCutoffAt = resolveMockDayCutoffAt(
        dto.mockDate,
        mockDayTimers.dayCutoffTime,
        timeZone,
      );
    } catch (err) {
      throw new BadRequestException(
        err instanceof Error ? err.message : 'Invalid mock day cutoff',
      );
    }

    const needsSpeaking = packageExamSkills(enrollment.package.skills).includes(
      ExamSkill.SPEAKING,
    );
    if (needsSpeaking && !dto.speakingSlotId) {
      throw new BadRequestException(
        'Speaking slot is required for this package',
      );
    }
    if (!needsSpeaking && dto.speakingSlotId) {
      throw new BadRequestException(
        'Speaking slot is not required for this package',
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      if (!needsSpeaking) {
        const updated = await tx.enrollment.update({
          where: { id: enrollment.id },
          data: {
            mockDate: new Date(dto.mockDate),
            mockTime: dto.mockTime,
            mockDayCutoffAt,
          },
        });
        return { updated, slot: null, speakingSessionId: null };
      }

      const slot = await tx.teacherSlot.findUnique({
        where: { id: dto.speakingSlotId! },
      });
      if (!slot || slot.status !== SlotStatus.AVAILABLE) {
        throw new BadRequestException('Speaking slot is no longer available');
      }

      const booked = await tx.teacherSlot.updateMany({
        where: { id: dto.speakingSlotId, status: SlotStatus.AVAILABLE },
        data: { status: SlotStatus.BOOKED, version: { increment: 1 } },
      });
      if (booked.count === 0) {
        throw new BadRequestException('Speaking slot booking conflict');
      }

      if (
        enrollment.speakingSlotId &&
        enrollment.speakingSlotId !== dto.speakingSlotId
      ) {
        await tx.teacherSlot.updateMany({
          where: { id: enrollment.speakingSlotId },
          data: { status: SlotStatus.AVAILABLE, version: { increment: 1 } },
        });
      }

      const updated = await tx.enrollment.update({
        where: { id: enrollment.id },
        data: {
          mockDate: new Date(dto.mockDate),
          mockTime: dto.mockTime,
          mockDayCutoffAt,
          speakingTeacherId: slot.teacherId,
          speakingSlotId: slot.id,
        },
      });

      const speakingAttempt = enrollment.examSession?.sectionAttempts.find(
        (a) => a.skill === ExamSkill.SPEAKING,
      );
      if (speakingAttempt?.speakingSession) {
        await tx.speakingSession.update({
          where: { id: speakingAttempt.speakingSession.id },
          data: {
            teacherId: slot.teacherId,
            scheduledAt: slot.startsAt,
          },
        });
      }

      return { updated, slot, speakingSessionId: speakingAttempt?.speakingSession?.id };
    });

    const speakingTeacher =
      result.slot != null
        ? await this.prisma.teacherProfile.findUnique({
            where: { id: result.slot.teacherId },
            include: { user: true },
          })
        : null;
    if (speakingTeacher && result.speakingSessionId && result.slot) {
      await this.notifications.create(
        speakingTeacher.userId,
        'Speaking session rescheduled',
        `Session moved to ${result.slot.startsAt.toLocaleString()}.`,
        NotificationType.REMINDER,
        examinerSpeakingPath(
          speakingTeacher.institutionId,
          result.speakingSessionId,
        ),
      );
    }

    const studentUser = await this.prisma.user.findFirst({
      where: { studentProfile: { id: user.studentProfileId! } },
    });
    if (studentUser) {
      await this.notifications.create(
        studentUser.id,
        'Mock rescheduled',
        `Your mock is now scheduled for ${result.updated.mockDate.toLocaleDateString()} at ${result.updated.mockTime}.`,
        NotificationType.INFO,
        '/student/mock-day',
      );
    }

    await this.audit.log({
      userId: user.id,
      action: AuditAction.BOOKING_RESCHEDULE,
      entity: 'enrollment',
      entityId: result.updated.id,
      metadata: {
        enrollmentCode: result.updated.enrollmentCode,
        mockDate: result.updated.mockDate,
        mockTime: result.updated.mockTime,
        speakingSlotId: dto.speakingSlotId,
      },
    });

    return {
      enrollmentId: result.updated.id,
      enrollmentCode: result.updated.enrollmentCode,
      mockDate: result.updated.mockDate,
      mockTime: result.updated.mockTime,
      status: 'rescheduled',
    };
  }

  /**
   * Student schedules a speaking slot from their assigned examiner's availability.
   * Used for admin-granted mocks where the slot is not chosen at grant time.
   */
  async scheduleSpeakingSlot(
    enrollmentId: string,
    dto: ScheduleSpeakingSlotDto,
    user: RequestUser,
  ) {
    if (!user.studentProfileId) {
      throw new ForbiddenException('Only students can schedule speaking slots');
    }

    const enrollment = await this.prisma.enrollment.findFirst({
      where: { id: enrollmentId, studentId: user.studentProfileId },
      include: {
        package: true,
        examSession: {
          include: {
            sectionAttempts: { include: { speakingSession: true } },
          },
        },
      },
    });
    if (!enrollment?.examSession) {
      throw new NotFoundException('Enrollment not found');
    }
    if (enrollment.status === EnrollmentStatus.MISSED) {
      throw new BadRequestException('This mock was missed. Ask an admin to reappoint it.');
    }
    if (!enrollment.speakingTeacherId) {
      throw new BadRequestException('No speaking examiner is assigned to this mock');
    }
    if (enrollment.institutionGranted) {
      throw new BadRequestException(
        'Your centre schedules the speaking time for this mock. Contact your centre admin if it is missing.',
      );
    }

    const needsSpeaking = packageExamSkills(enrollment.package.skills).includes(
      ExamSkill.SPEAKING,
    );
    if (!needsSpeaking) {
      throw new BadRequestException('This package does not include speaking');
    }

    const slot = await this.prisma.teacherSlot.findUnique({
      where: { id: dto.speakingSlotId },
    });
    if (!slot || slot.status !== SlotStatus.AVAILABLE) {
      throw new BadRequestException('Speaking slot is no longer available');
    }
    if (slot.teacherId !== enrollment.speakingTeacherId) {
      throw new BadRequestException(
        'Speaking slot must belong to your assigned examiner',
      );
    }

    if (enrollment.speakingSlotId) {
      throw new BadRequestException(
        'Your speaking slot is already booked and cannot be changed',
      );
    }

    const timeZone = await this.settings.getPlatformTimezone();
    const slotDateIso = calendarDateIsoInTimeZone(slot.startsAt, timeZone);
    const todayIso = calendarDateIsoInTimeZone(new Date(), timeZone);
    const flexibleGrant = isFlexibleGrant(enrollment);

    if (flexibleGrant) {
      const maxDateIso = addCalendarDaysIso(todayIso, 28, timeZone);
      if (slotDateIso < todayIso || slotDateIso > maxDateIso) {
        throw new BadRequestException(
          'Speaking slot must be within the next 28 days',
        );
      }
    } else {
      const mockDateIso = extractCalendarDateIso(enrollment.mockDate, timeZone);
      const allowedDates = new Set([mockDateIso]);
      if (mockDateIso < todayIso) {
        allowedDates.add(todayIso);
      }
      if (!allowedDates.has(slotDateIso)) {
        throw new BadRequestException(
          'Speaking slot must be on your mock day or today',
        );
      }
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const booked = await tx.teacherSlot.updateMany({
        where: { id: dto.speakingSlotId, status: SlotStatus.AVAILABLE },
        data: { status: SlotStatus.BOOKED, version: { increment: 1 } },
      });
      if (booked.count === 0) {
        throw new BadRequestException('Speaking slot booking conflict');
      }

      if (
        enrollment.speakingSlotId &&
        enrollment.speakingSlotId !== dto.speakingSlotId
      ) {
        await tx.teacherSlot.updateMany({
          where: { id: enrollment.speakingSlotId },
          data: { status: SlotStatus.AVAILABLE, version: { increment: 1 } },
        });
      }

      const updated = await tx.enrollment.update({
        where: { id: enrollment.id },
        data: {
          speakingSlotId: slot.id,
          speakingTeacherId: slot.teacherId,
        },
      });

      const speakingAttempt = enrollment.examSession!.sectionAttempts.find(
        (a) => a.skill === ExamSkill.SPEAKING,
      );
      let speakingSessionId: string | null = null;
      if (speakingAttempt?.speakingSession) {
        await tx.speakingSession.update({
          where: { id: speakingAttempt.speakingSession.id },
          data: {
            teacherId: slot.teacherId,
            scheduledAt: slot.startsAt,
          },
        });
        speakingSessionId = speakingAttempt.speakingSession.id;
      } else if (speakingAttempt) {
        const created = await tx.speakingSession.create({
          data: {
            sectionAttemptId: speakingAttempt.id,
            teacherId: slot.teacherId,
            status: 'SCHEDULED',
            scheduledAt: slot.startsAt,
          },
        });
        speakingSessionId = created.id;
      }

      return { updated, slot, speakingSessionId };
    });

    const speakingTeacher = await this.prisma.teacherProfile.findUnique({
      where: { id: result.slot.teacherId },
      include: { user: true },
    });
    if (speakingTeacher && result.speakingSessionId) {
      await this.notifications.create(
        speakingTeacher.userId,
        'Speaking session scheduled',
        `Speaking session on ${result.slot.startsAt.toLocaleString()}.`,
        NotificationType.REMINDER,
        examinerSpeakingPath(
          speakingTeacher.institutionId,
          result.speakingSessionId,
        ),
      );
    }

    await this.audit.log({
      userId: user.id,
      action: AuditAction.BOOKING_RESCHEDULE,
      entity: 'enrollment',
      entityId: enrollment.id,
      metadata: {
        action: 'schedule_speaking_slot',
        speakingSlotId: dto.speakingSlotId,
      },
    });

    return {
      enrollmentId: result.updated.id,
      scheduledAt: result.slot.startsAt,
      status: 'scheduled',
    };
  }

  /**
   * Admin reappoints a missed mock (granted or paid) on a new day without charging again.
   */
  async reappointEnrollment(dto: ReappointEnrollmentDto, actorId: string) {
    const prior = await this.prisma.enrollment.findUnique({
      where: { id: dto.enrollmentId },
      include: { package: true, order: true },
    });
    if (!prior) {
      throw new NotFoundException('Enrollment not found');
    }
    if (prior.status !== EnrollmentStatus.MISSED) {
      throw new BadRequestException(
        'Only missed mocks can be reappointed',
      );
    }

    const flexibleReappoint = prior.adminGranted && !dto.mockTime;
    const result = await this.provisionEnrollment({
      studentProfileId: prior.studentId,
      actorUserId: actorId,
      packageId: prior.packageId,
      mockDate: dto.mockDate,
      mockTime: flexibleReappoint ? null : (dto.mockTime ?? prior.mockTime ?? undefined),
      mockDayCutoffTime: dto.mockDayCutoffTime,
      writingTeacherId: dto.writingTeacherId ?? prior.writingTeacherId ?? undefined,
      speakingTeacherId: dto.speakingTeacherId ?? prior.speakingTeacherId ?? undefined,
      reappointmentOfId: prior.id,
      complimentary: prior.adminGranted,
      isReappointment: !prior.adminGranted,
      auditAction: AuditAction.ADMIN_ENROLLMENT_GRANT,
    });

    return { ...result, reappointmentOfId: prior.id, priorEnrollmentCode: prior.enrollmentCode };
  }

  /**
   * Tells the booking UI how many unique (never-seen) tests remain for this
   * student on a package, so re-purchase can be guided or discouraged.
   */
  async getContentAvailability(packageId: string, user: RequestUser) {
    if (!user.studentProfileId) {
      throw new ForbiddenException('Only students can view content availability');
    }

    const pkg = await this.prisma.mockTestPackage.findUnique({
      where: { id: packageId },
    });
    if (!pkg) throw new NotFoundException('Package not found');

    const availability = await evaluatePackageAvailability(
      this.prisma,
      user.studentProfileId,
      pkg,
    );

    return {
      packageId,
      canPurchase: availability.canPurchase,
      blockingReason: availability.blockingReason,
      perSkill: availability.perSkill.map((s) => ({
        skill: s.skill.toLowerCase(),
        testId: s.testId,
        testCode: s.testCode,
        alreadyTaken: s.alreadyTaken,
        canPurchase: s.canPurchase,
      })),
      message: availability.canPurchase
        ? 'This package is available for you to book.'
        : (availability.blockingReason ??
          'You cannot purchase this package.'),
    };
  }

  private packageSkills(pkg: { skills: unknown }): string[] {
    return packageExamSkills(pkg.skills).map((skill) => skill.toLowerCase());
  }

  /** Create an AVAILABLE one-off slot for institution/custom speaking times. */
  private async createAdHocSpeakingSlot(
    tx: Prisma.TransactionClient,
    params: {
      teacherId: string;
      mockDate: string;
      speakingTime: string;
      timeZone: string;
    },
  ): Promise<string> {
    if (!/^\d{2}:\d{2}$/.test(params.speakingTime)) {
      throw new BadRequestException('speakingTime must be in HH:mm format');
    }
    const [hours, minutes] = params.speakingTime.split(':').map(Number);
    const dateIso = extractCalendarDateIso(params.mockDate, params.timeZone);
    const startsAt = zonedWallClockToUtc(
      dateIso,
      hours!,
      minutes!,
      0,
      params.timeZone,
    );
    if (startsAt.getTime() <= Date.now()) {
      throw new BadRequestException('Speaking time must be in the future');
    }
    const endsAt = new Date(startsAt.getTime() + 20 * 60_000);

    const existing = await tx.teacherSlot.findUnique({
      where: {
        teacherId_startsAt: {
          teacherId: params.teacherId,
          startsAt,
        },
      },
    });
    if (existing) {
      if (existing.status === SlotStatus.BOOKED) {
        throw new BadRequestException(
          'That speaking time is already booked for this examiner',
        );
      }
      if (existing.status === SlotStatus.BLOCKED) {
        throw new BadRequestException(
          'That speaking time is blocked for this examiner',
        );
      }
      return existing.id;
    }

    const created = await tx.teacherSlot.create({
      data: {
        teacherId: params.teacherId,
        startsAt,
        endsAt,
        status: SlotStatus.AVAILABLE,
      },
    });
    return created.id;
  }

  /**
   * Creates a pending enrollment + order and redirects the student to Uzum
   * Checkout. Speaking slots are held until payment or expiry.
   */
  async initiatePaidCheckout(
    params: ProvisionEnrollmentParams,
    user: RequestUser,
    pkg: { id: string; slug: string; title: string; price: number; currency: string; skills: unknown; isActive: boolean },
  ) {
    const { studentProfileId, actorUserId } = params;
    await this.validatePaidBookingParams(params, pkg);

    const enrollmentCode = await this.generateCode('ENR');
    const orderCode = await this.generateCode('ORD');
    const checkoutExpiresAt = new Date(
      Date.now() + BookingsService.CHECKOUT_HOLD_MINUTES * 60_000,
    );

    const timeZone = await this.settings.getPlatformTimezone();
    const mockDayTimers = await this.settings.getMockDayTimers();
    const mockDayCutoffAt = resolveMockDayCutoffAt(
      params.mockDate,
      mockDayTimers.dayCutoffTime,
      timeZone,
    );

    const pending = await this.prisma.$transaction(async (tx) => {
      let slot: { id: string; teacherId: string; startsAt: Date } | null = null;
      const skills = this.packageSkills(pkg);
      const needsSpeaking = skills.includes('speaking');

      if (needsSpeaking && params.speakingSlotId) {
        const speakingSlot = await tx.teacherSlot.findUnique({
          where: { id: params.speakingSlotId },
        });
        if (!speakingSlot || speakingSlot.status !== SlotStatus.AVAILABLE) {
          throw new BadRequestException('Speaking slot is no longer available');
        }
        const booked = await tx.teacherSlot.updateMany({
          where: { id: params.speakingSlotId, status: SlotStatus.AVAILABLE },
          data: { status: SlotStatus.BOOKED, version: { increment: 1 } },
        });
        if (booked.count === 0) {
          throw new BadRequestException('Speaking slot booking conflict');
        }
        slot = speakingSlot;
      }

      const enrollment = await tx.enrollment.create({
        data: {
          enrollmentCode,
          studentId: studentProfileId,
          packageId: params.packageId,
          mockDate: new Date(params.mockDate),
          mockTime: params.mockTime ?? null,
          mockDayCutoffAt,
          status: EnrollmentStatus.PENDING_PAYMENT,
          writingTeacherId: params.writingTeacherId ?? null,
          speakingTeacherId:
            params.speakingTeacherId ?? slot?.teacherId ?? null,
          speakingSlotId: params.speakingSlotId ?? null,
        },
      });

      const order = await tx.order.create({
        data: {
          orderCode,
          studentId: studentProfileId,
          enrollmentId: enrollment.id,
          packageId: params.packageId,
          amount: pkg.price,
          currency: pkg.currency,
          paymentMethod: PaymentMethod.CARD,
          status: OrderStatus.PENDING,
          checkoutExpiresAt,
        },
      });

      return { enrollment, order, slot };
    });

    const checkout = await this.uzum.createCheckout({
      orderId: pending.order.id,
      orderCode: pending.order.orderCode,
      email: user.email,
      name: user.name,
      amount: pkg.price,
      currency: pkg.currency,
      packageTitle: pkg.title,
      clientId: user.id,
      sessionTimeoutSecs: BookingsService.CHECKOUT_HOLD_MINUTES * 60,
    });

    await this.prisma.order.update({
      where: { id: pending.order.id },
      data: {
        uzumCheckoutId: checkout.checkoutId,
        checkoutUrl: checkout.checkoutUrl,
      },
    });

    await this.audit.log({
      userId: actorUserId,
      action: params.auditAction,
      entity: 'order',
      entityId: pending.order.id,
      metadata: {
        orderCode: pending.order.orderCode,
        enrollmentCode: pending.enrollment.enrollmentCode,
        status: 'pending_payment',
      },
    });

    return {
      enrollmentId: pending.enrollment.id,
      enrollmentCode: pending.enrollment.enrollmentCode,
      orderId: pending.order.id,
      orderCode: pending.order.orderCode,
      sessionCode: null,
      amount: pending.order.amount,
      currency: pending.order.currency,
      status: 'pending_payment',
      checkoutUrl: checkout.checkoutUrl,
      checkoutExpiresAt: checkoutExpiresAt.toISOString(),
    };
  }

  /** Completes exam delivery after Uzum Checkout confirms payment. */
  async fulfillPendingPayment(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        enrollment: true,
        package: true,
        student: { include: { user: true } },
      },
    });
    if (!order?.enrollment || !order.package || !order.student || !order.studentId) {
      throw new NotFoundException('Pending order not found');
    }
    if (order.enrollment.status !== EnrollmentStatus.PENDING_PAYMENT) {
      return {
        enrollmentId: order.enrollment.id,
        enrollmentCode: order.enrollment.enrollmentCode,
        alreadyFulfilled: true,
      };
    }

    const result = await this.completeEnrollmentDelivery(
      order.enrollment,
      order.package,
      order.studentId,
    );

    const studentUser = order.student.user;
    const dateLabel = order.enrollment.mockDate.toLocaleDateString();
    await this.notifications.create(
      studentUser.id,
      'Mock booked',
      `Your mock is confirmed for ${dateLabel}${order.enrollment.mockTime ? ` at ${order.enrollment.mockTime}` : ''}.`,
      NotificationType.INFO,
      '/student/mock-day',
    );

    if (order.enrollment.writingTeacherId) {
      const writingTeacher = await this.prisma.teacherProfile.findUnique({
        where: { id: order.enrollment.writingTeacherId },
        include: { user: true },
      });
      if (writingTeacher) {
        await this.notifications.create(
          writingTeacher.userId,
          'Writing submission incoming',
          `A new writing submission will be assigned after the student's exam.`,
          NotificationType.GRADING,
          examinerWritingGradingHubPath(writingTeacher.institutionId),
        );
      }
    }

    if (order.enrollment.speakingTeacherId && result.speakingSession) {
      const speakingTeacher = await this.prisma.teacherProfile.findUnique({
        where: { id: order.enrollment.speakingTeacherId },
        include: { user: true },
      });
      if (speakingTeacher && result.slot) {
        await this.notifications.create(
          speakingTeacher.userId,
          'Speaking session scheduled',
          `Speaking session on ${result.slot.startsAt.toLocaleString()}.`,
          NotificationType.REMINDER,
          examinerSpeakingPath(
          speakingTeacher.institutionId,
          result.speakingSession.id,
        ),
        );
      }
    }

    return {
      enrollmentId: order.enrollment.id,
      enrollmentCode: order.enrollment.enrollmentCode,
      sessionCode: result.session.sessionCode,
      alreadyFulfilled: false,
    };
  }

  /** Releases held resources when checkout expires or payment fails. */
  async cancelPendingCheckout(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { enrollment: true },
    });
    if (!order || order.status !== OrderStatus.PENDING) return;

    await this.prisma.$transaction(async (tx) => {
      if (order.enrollment?.speakingSlotId) {
        await tx.teacherSlot.updateMany({
          where: {
            id: order.enrollment.speakingSlotId,
            status: SlotStatus.BOOKED,
          },
          data: { status: SlotStatus.AVAILABLE, version: { increment: 1 } },
        });
      }

      if (order.enrollmentId) {
        await tx.enrollment.update({
          where: { id: order.enrollmentId },
          data: { status: EnrollmentStatus.CANCELLED },
        });
      }

      await tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.FAILED },
      });
    });
  }

  private async completeEnrollmentDelivery(
    enrollment: {
      id: string;
      speakingSlotId: string | null;
      writingTeacherId: string | null;
      speakingTeacherId: string | null;
    },
    pkg: { id: string; skills: unknown },
    studentProfileId: string,
  ) {
    const skills = this.packageSkills(pkg);
    const sessionCode = await this.generateCode('MOCK');

    return this.prisma.$transaction(async (tx) => {
      await tx.enrollment.update({
        where: { id: enrollment.id },
        data: { status: EnrollmentStatus.ENROLLED },
      });

      const session = await tx.examSession.create({
        data: {
          sessionCode,
          enrollmentId: enrollment.id,
          state: ExamSessionState.ENROLLED,
        },
      });

      const assignments = await assignContentTests(tx, studentProfileId, pkg as never);
      const testBySkill = new Map(
        assignments.map((a) => [a.skill, a.testId]),
      );

      for (const skill of skills) {
        const examSkill = skill.toUpperCase() as ExamSkill;
        if (!testBySkill.get(examSkill)) {
          throw new BadRequestException(
            `Package is missing a published ${skill} test`,
          );
        }
      }

      let slot: { id: string; teacherId: string; startsAt: Date } | null = null;
      if (enrollment.speakingSlotId) {
        slot = await tx.teacherSlot.findUnique({
          where: { id: enrollment.speakingSlotId },
        });
      }

      let speakingSession: { id: string } | null = null;

      for (const skill of skills) {
        const examSkill = skill.toUpperCase() as ExamSkill;
        const attempt = await tx.sectionAttempt.create({
          data: {
            sessionId: session.id,
            skill: examSkill,
            contentTestId: testBySkill.get(examSkill) ?? null,
          },
        });

        if (skill === 'speaking' && slot) {
          speakingSession = await tx.speakingSession.create({
            data: {
              sectionAttemptId: attempt.id,
              teacherId: slot.teacherId,
              status: 'SCHEDULED',
              scheduledAt: slot.startsAt,
            },
          });
        }
      }

      return { session, slot, speakingSession };
    });
  }

  private async validatePaidBookingParams(
    params: ProvisionEnrollmentParams,
    pkg: { id: string; skills: unknown; isActive: boolean },
  ) {
    if (!pkg.isActive) throw new NotFoundException('Package not found');

    const skills = this.packageSkills(pkg);
    const needsWriting = skills.includes('writing');
    const needsSpeaking = skills.includes('speaking');

    if (needsWriting && !params.writingTeacherId) {
      throw new BadRequestException('Writing examiner is required for this package');
    }
    if (needsSpeaking && !params.speakingTeacherId) {
      throw new BadRequestException('Speaking examiner is required for this package');
    }
    if (needsSpeaking && !params.speakingSlotId) {
      throw new BadRequestException('Speaking slot is required for this package');
    }
    if (!needsWriting && params.writingTeacherId) {
      throw new BadRequestException('Writing examiner is not required for this package');
    }
    if (!needsSpeaking && (params.speakingTeacherId || params.speakingSlotId)) {
      throw new BadRequestException('Speaking slot is not required for this package');
    }

    const timeZone = await this.settings.getPlatformTimezone();
    const mockDayTimers = await this.settings.getMockDayTimers();
    const mockDayCutoffAt = resolveMockDayCutoffAt(
      params.mockDate,
      mockDayTimers.dayCutoffTime,
      timeZone,
    );

    if (!params.mockTime || !/^\d{2}:\d{2}$/.test(params.mockTime)) {
      throw new BadRequestException('mockTime must be in HH:mm format');
    }
    const mockStart = mockStartDateTime(
      new Date(params.mockDate),
      params.mockTime,
    );
    if (mockStart.getTime() <= Date.now()) {
      throw new BadRequestException('Mock date and time must be in the future');
    }
    if (mockStart.getTime() > mockDayCutoffAt.getTime()) {
      throw new BadRequestException('Mock start time must be before the day cutoff');
    }

    const availability = await evaluatePackageAvailability(
      this.prisma,
      params.studentProfileId,
      pkg as never,
    );
    if (!params.reappointmentOfId && !availability.canPurchase) {
      throw new BadRequestException(
        availability.blockingReason ??
          'You cannot purchase this package with your current test history.',
      );
    }
  }

  private async generateCode(prefix: string): Promise<string> {
    const num = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${num}`;
  }
}
