import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EnrollmentStatus,
  ExamSessionState,
  ExamSkill,
  NotificationType,
  OrderStatus,
  PaymentMethod,
  SlotStatus,
} from '@prisma/client';
import { RequestUser } from '../../common/types/request-user';
import { AuditAction } from '../../common/audit/audit.actions';
import { AuditService } from '../../common/audit/audit.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { RescheduleBookingDto } from './dto/reschedule-booking.dto';
import {
  assignContentTests,
  remainingUniqueAttempts,
} from '../content/content-assignment';
import { packageExamSkills } from '../content/package-skills';

@Injectable()
export class BookingsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private audit: AuditService,
  ) {}

  async getAvailability(date: string, teacherId?: string) {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const slots = await this.prisma.teacherSlot.findMany({
      where: {
        startsAt: { gte: dayStart, lte: dayEnd },
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
        ...(speciality
          ? {
              speciality:
                speciality === 'both'
                  ? 'BOTH'
                  : speciality === 'writing'
                    ? { in: ['WRITING', 'BOTH'] as const }
                    : (speciality.toUpperCase() as 'WRITING' | 'SPEAKING'),
            }
          : {}),
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
    if (needsSpeaking && (!dto.speakingTeacherId || !dto.speakingSlotId)) {
      throw new BadRequestException(
        'Speaking examiner and slot are required for this package',
      );
    }
    if (!needsWriting && dto.writingTeacherId) {
      throw new BadRequestException(
        'Writing examiner is not required for this package',
      );
    }
    if (!needsSpeaking && (dto.speakingTeacherId || dto.speakingSlotId)) {
      throw new BadRequestException(
        'Speaking slot is not required for this package',
      );
    }

    const enrollmentCode = await this.generateCode('ENR');
    const orderCode = await this.generateCode('ORD');
    const sessionCode = await this.generateCode('MOCK');

    const result = await this.prisma.$transaction(async (tx) => {
      let slot: { id: string; teacherId: string; startsAt: Date } | null =
        null;

      if (needsSpeaking && dto.speakingSlotId) {
        const speakingSlot = await tx.teacherSlot.findUnique({
          where: { id: dto.speakingSlotId },
        });
        if (!speakingSlot || speakingSlot.status !== SlotStatus.AVAILABLE) {
          throw new BadRequestException('Speaking slot is no longer available');
        }
        if (
          dto.speakingTeacherId &&
          dto.speakingTeacherId !== speakingSlot.teacherId
        ) {
          throw new BadRequestException(
            'Speaking examiner must match the selected slot',
          );
        }

        const booked = await tx.teacherSlot.updateMany({
          where: { id: dto.speakingSlotId, status: SlotStatus.AVAILABLE },
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
          studentId: user.studentProfileId!,
          packageId: dto.packageId,
          mockDate: new Date(dto.mockDate),
          mockTime: dto.mockTime,
          status: EnrollmentStatus.ENROLLED,
          writingTeacherId: dto.writingTeacherId ?? null,
          speakingTeacherId: dto.speakingTeacherId ?? slot?.teacherId ?? null,
          speakingSlotId: dto.speakingSlotId ?? null,
        },
      });

      const order = await tx.order.create({
        data: {
          orderCode,
          studentId: user.studentProfileId!,
          enrollmentId: enrollment.id,
          packageId: dto.packageId,
          amount: pkg.price,
          currency: pkg.currency,
          paymentMethod:
            (dto.paymentMethod?.toUpperCase() as PaymentMethod) ??
            PaymentMethod.CARD,
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

      // Pin a content test per skill, preferring tests the student has not yet
      // taken so re-purchasing the same package serves fresh content.
      const assignments = await assignContentTests(
        tx,
        user.studentProfileId!,
        pkg,
      );
      const testBySkill = new Map(
        assignments.map((a) => [a.skill, a.testId]),
      );

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

      return { enrollment, order, session, slot, speakingSession };
    });

    const [writingTeacher, speakingTeacher, studentUser] = await Promise.all([
      dto.writingTeacherId
        ? this.prisma.teacherProfile.findUnique({
            where: { id: dto.writingTeacherId },
            include: { user: true },
          })
        : Promise.resolve(null),
      dto.speakingTeacherId
        ? this.prisma.teacherProfile.findUnique({
            where: { id: dto.speakingTeacherId },
            include: { user: true },
          })
        : Promise.resolve(null),
      this.prisma.user.findFirst({
        where: { studentProfile: { id: user.studentProfileId! } },
      }),
    ]);

    if (studentUser) {
      await this.notifications.create(
        studentUser.id,
        'Mock booked',
        `Your mock is confirmed for ${new Date(dto.mockDate).toLocaleDateString()} at ${dto.mockTime}.`,
        NotificationType.INFO,
        '/student/mock-day',
      );
    }

    if (writingTeacher) {
      await this.notifications.create(
        writingTeacher.userId,
        'Writing submission incoming',
        `A new writing submission will be assigned after the student's exam.`,
        NotificationType.GRADING,
        '/teacher/grading',
      );
    }

    if (speakingTeacher && result.slot && result.speakingSession) {
      await this.notifications.create(
        speakingTeacher.userId,
        'Speaking session scheduled',
        `Speaking session on ${result.slot.startsAt.toLocaleString()}.`,
        NotificationType.REMINDER,
        `/teacher/speaking?session=${result.speakingSession.id}`,
      );
    }

    await this.audit.log({
      userId: user.id,
      action: AuditAction.BOOKING_CREATE,
      entity: 'enrollment',
      entityId: result.enrollment.id,
      metadata: {
        enrollmentCode: result.enrollment.enrollmentCode,
        orderCode: result.order.orderCode,
        sessionCode: result.session.sessionCode,
        packageId: dto.packageId,
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
      status: 'confirmed',
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
        `/teacher/speaking?session=${result.speakingSessionId}`,
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

    const perSkill = await remainingUniqueAttempts(
      this.prisma,
      user.studentProfileId,
      pkg,
    );

    const freshAvailable = perSkill.every((s) => s.remaining > 0);
    const anyExhausted = perSkill.some((s) => s.total > 0 && s.remaining === 0);

    return {
      packageId,
      perSkill: perSkill.map((s) => ({
        skill: s.skill.toLowerCase(),
        total: s.total,
        remaining: s.remaining,
      })),
      freshAvailable,
      anyExhausted,
      message: anyExhausted
        ? 'You have already taken all available tests for at least one skill. Re-purchasing may repeat content for that skill.'
        : freshAvailable
          ? 'Fresh, never-seen tests are available for every skill in this package.'
          : 'Content availability is limited for this package.',
    };
  }

  private packageSkills(pkg: { skills: unknown }): string[] {
    return packageExamSkills(pkg.skills).map((skill) => skill.toLowerCase());
  }

  private async generateCode(prefix: string): Promise<string> {
    const num = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${num}`;
  }
}
