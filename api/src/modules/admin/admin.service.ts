import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EnrollmentStatus,
  ExamSkill,
  NotificationType,
  Prisma,
  SlotStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditAction } from '../../common/audit/audit.actions';
import { AuditService } from '../../common/audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  SECTION_DURATIONS_SEC,
  skillForActiveState,
} from '../exam-sessions/exam-state-machine';
import { UpdateBandTableDto } from './dto/band-table.dto';
import { CreatePackageDto, UpdatePackageDto } from './dto/package.dto';
import { RefundOrderDto } from './dto/refund-order.dto';
import { UpdatePayoutDto } from './dto/update-payout.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';

const SKILL_ACCENTS = [
  { id: 'listening', name: 'Listening', detail: '~32 min · plays once', badge: 'Auto-scored', color: 'sky' },
  { id: 'reading', name: 'Reading', detail: '60 min · 3 passages', badge: 'Auto-scored', color: 'emerald' },
  { id: 'writing', name: 'Writing', detail: 'Task 1 + Task 2', badge: 'Teacher-graded', color: 'violet' },
  { id: 'speaking', name: 'Speaking', detail: 'Live · 11–14 min', badge: 'Teacher-graded', color: 'rose' },
];

const INTEGRITY_FLAG_EVENTS = new Set([
  'tab_switch',
  'paste_attempt',
  'fullscreen_exit',
  'audio_seek_attempt',
]);

function formatTimeLeft(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private audit: AuditService,
  ) {}

  async getDashboard() {
    const [
      totalEnrollments,
      activeSessions,
      totalRevenue,
      openTickets,
      liveSessions,
    ] = await Promise.all([
      this.prisma.enrollment.count(),
      this.prisma.enrollment.count({
        where: { status: 'IN_PROGRESS' },
      }),
      this.prisma.order.aggregate({
        where: { status: 'PAID' },
        _sum: { amount: true },
      }),
      this.prisma.supportTicket.count({
        where: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
      }),
      this.getLiveSessions(),
    ]);

    return {
      kpis: {
        totalEnrollments,
        activeExams: activeSessions,
        totalRevenue: totalRevenue._sum.amount ?? 0,
        openTickets,
      },
      liveSessions,
    };
  }

  async getLiveSessions() {
    const sessions = await this.prisma.examSession.findMany({
      where: {
        state: {
          in: [
            'LISTENING_ACTIVE',
            'READING_ACTIVE',
            'WRITING_ACTIVE',
            'SPEAKING_ACTIVE',
          ],
        },
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

    return sessions.map((s) => {
      const activeSkill = skillForActiveState(s.state);
      const skill = activeSkill?.toLowerCase() ?? 'listening';
      const attempt = activeSkill
        ? s.sectionAttempts.find((a) => a.skill === activeSkill)
        : undefined;
      const duration = activeSkill ? SECTION_DURATIONS_SEC[activeSkill] : 0;
      let remainingSec = 0;
      if (attempt?.startedAt && !attempt.submittedAt && duration > 0) {
        const elapsed = Math.floor(
          (Date.now() - attempt.startedAt.getTime()) / 1000,
        );
        remainingSec = Math.max(0, duration - elapsed);
      }
      const progress =
        duration > 0
          ? Math.round(((duration - remainingSec) / duration) * 100)
          : 0;
      const log = (s.integrityLog as { event?: string }[]) ?? [];
      const flags = log.filter((entry) =>
        INTEGRITY_FLAG_EVENTS.has(entry.event ?? ''),
      ).length;

      return {
        sessionCode: s.sessionCode,
        studentName: s.enrollment.student.user.name,
        country: s.enrollment.student.country ?? '—',
        skill,
        progress,
        timeLeft: formatTimeLeft(remainingSec),
        remainingSec,
        examiner: s.enrollment.speakingTeacher?.user.name,
        integrity: s.integrity.toLowerCase(),
        flags,
      };
    });
  }

  async getEnrollments() {
    const enrollments = await this.prisma.enrollment.findMany({
      include: {
        student: { include: { user: true } },
        writingTeacher: { include: { user: true } },
        speakingTeacher: { include: { user: true } },
        examSession: { include: { sectionAttempts: true } },
      },
      orderBy: { mockDate: 'desc' },
    });

    const lifecycleMap: Record<string, string> = {
      ENROLLED: 'in_progress',
      IN_PROGRESS: 'in_progress',
      AWAITING_RESULTS: 'awaiting_results',
      COMPLETED: 'complete',
      CANCELLED: 'complete',
    };

    return {
      summary: {
        total: enrollments.length,
        activeExams: enrollments.filter((e) => e.status === 'IN_PROGRESS')
          .length,
        awaitingResults: enrollments.filter(
          (e) => e.status === 'AWAITING_RESULTS',
        ).length,
        completed: enrollments.filter((e) => e.status === 'COMPLETED').length,
      },
      enrollments: enrollments.map((e) => ({
        id: e.id,
        enrollmentId: e.enrollmentCode,
        studentName: e.student.user.name,
        targetBand: e.student.targetBand,
        country: e.student.country ?? '—',
        examDate: e.mockDate,
        examTime: e.mockTime,
        completedModules: e.examSession?.sectionAttempts
          .filter((a) => a.submittedAt)
          .map((a) => a.skill.toLowerCase()) ?? [],
        speakingExaminer: e.speakingTeacher?.user.name ?? '—',
        writingExaminer: e.writingTeacher?.user.name ?? '—',
        lifecycle: lifecycleMap[e.status] ?? 'in_progress',
      })),
    };
  }

  async getTeachers() {
    const teachers = await this.prisma.teacherProfile.findMany({
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });

    return teachers.map((t) => ({
      id: t.id,
      name: t.user.name,
      email: t.user.email,
      status: t.status.toLowerCase(),
      rating: t.rating,
      sessions: t.totalSessions,
      totalEarned: t.totalEarned,
      speciality: t.speciality.toLowerCase(),
    }));
  }

  async updateTeacherStatus(
    teacherId: string,
    status: 'approved' | 'pending' | 'suspended',
    actorId: string,
  ) {
    const updated = await this.prisma.teacherProfile.update({
      where: { id: teacherId },
      data: { status: status.toUpperCase() as 'APPROVED' | 'PENDING' | 'SUSPENDED' },
    });

    await this.audit.log({
      userId: actorId,
      action: AuditAction.ADMIN_TEACHER_STATUS,
      entity: 'teacher_profile',
      entityId: teacherId,
      metadata: { status },
    });

    return updated;
  }

  async getOrders() {
    const orders = await this.prisma.order.findMany({
      include: {
        student: { include: { user: true } },
        package: true,
        enrollment: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((o) => ({
      id: o.id,
      orderId: o.orderCode,
      studentName: o.student.user.name,
      enrollmentRef: o.enrollment?.enrollmentCode,
      package: o.package.title,
      paymentMethod: o.paymentMethod.toLowerCase(),
      amount: o.amount,
      status: o.status.toLowerCase(),
      createdAt: o.createdAt,
    }));
  }

  async getDisputes() {
    const tickets = await this.prisma.supportTicket.findMany({
      include: { assignee: true, enrollment: true },
      orderBy: { createdAt: 'desc' },
    });

    return tickets.map((t) => ({
      id: t.id,
      ticketId: t.ticketCode,
      type: t.type.toLowerCase(),
      priority: t.priority.toLowerCase(),
      status: t.status.toLowerCase(),
      subject: t.subject,
      sla: {
        state: t.slaState.toLowerCase(),
        progress: t.slaProgress,
      },
      assignee: t.assignee?.name,
      createdAt: t.createdAt,
    }));
  }

  async getReports() {
    const [enrollments, orders, teachers] = await Promise.all([
      this.prisma.enrollment.groupBy({
        by: ['status'],
        _count: true,
      }),
      this.prisma.order.aggregate({
        where: { status: 'PAID' },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.teacherProfile.findMany({
        orderBy: { totalSessions: 'desc' },
        take: 5,
        include: { user: true },
      }),
    ]);

    return {
      funnel: enrollments.map((e) => ({
        status: e.status.toLowerCase(),
        count: e._count,
      })),
      revenue: {
        total: orders._sum.amount ?? 0,
        orderCount: orders._count,
      },
      teacherLeaderboard: teachers.map((t) => ({
        name: t.user.name,
        sessions: t.totalSessions,
        rating: t.rating,
        earned: t.totalEarned,
      })),
    };
  }

  // ─── Packages & Pricing ──────────────────────────────────────────────────

  async getPackages() {
    const [packages, tests] = await Promise.all([
      this.prisma.mockTestPackage.findMany({
        orderBy: [{ isActive: 'desc' }, { mostPopular: 'desc' }, { price: 'desc' }],
        include: {
          _count: { select: { enrollments: true, orders: true } },
        },
      }),
      this.prisma.contentTest.findMany({
        select: { id: true, code: true, title: true, type: true, status: true },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    return {
      packages: packages.map((pkg) => ({
        id: pkg.id,
        slug: pkg.slug,
        title: pkg.title,
        description: pkg.description,
        price: pkg.price,
        currency: pkg.currency,
        examType: pkg.examType,
        mostPopular: pkg.mostPopular,
        rating: pkg.rating,
        reviewCount: pkg.reviewCount,
        skills: pkg.skills,
        included: pkg.included,
        rules: pkg.rules,
        listeningTestId: pkg.listeningTestId,
        readingTestId: pkg.readingTestId,
        writingTestId: pkg.writingTestId,
        speakingBankId: pkg.speakingBankId,
        isActive: pkg.isActive,
        enrollmentCount: pkg._count.enrollments,
        orderCount: pkg._count.orders,
        updatedAt: pkg.updatedAt,
      })),
      contentTests: tests.map((t) => ({
        id: t.id,
        code: t.code,
        title: t.title,
        type: t.type,
        status: t.status,
      })),
    };
  }

  private async resolveSlug(title: string, requested?: string, excludeId?: string) {
    const base = slugify(requested || title) || 'package';
    let candidate = base;
    let suffix = 1;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const existing = await this.prisma.mockTestPackage.findUnique({
        where: { slug: candidate },
      });
      if (!existing || existing.id === excludeId) return candidate;
      suffix += 1;
      candidate = `${base}-${suffix}`;
    }
  }

  async createPackage(dto: CreatePackageDto, actorId: string) {
    const slug = await this.resolveSlug(dto.title, dto.slug);

    const created = await this.prisma.mockTestPackage.create({
      data: {
        slug,
        title: dto.title,
        description: dto.description ?? null,
        price: dto.price,
        currency: dto.currency ?? 'USD',
        examType: dto.examType ?? 'ACADEMIC',
        mostPopular: dto.mostPopular ?? false,
        rating: dto.rating ?? null,
        skills: (dto.skills ?? SKILL_ACCENTS) as Prisma.InputJsonValue,
        included: (dto.included ?? []) as Prisma.InputJsonValue,
        rules: (dto.rules ?? []) as Prisma.InputJsonValue,
        listeningTestId: dto.listeningTestId || null,
        readingTestId: dto.readingTestId || null,
        writingTestId: dto.writingTestId || null,
        speakingBankId: dto.speakingBankId || null,
        isActive: dto.isActive ?? true,
      },
    });

    await this.audit.log({
      userId: actorId,
      action: AuditAction.ADMIN_PACKAGE_CREATE,
      entity: 'mock_test_package',
      entityId: created.id,
      metadata: { slug: created.slug, title: created.title },
    });

    return created;
  }

  async updatePackage(id: string, dto: UpdatePackageDto, actorId: string) {
    const existing = await this.prisma.mockTestPackage.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Package not found');

    const data: Prisma.MockTestPackageUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.slug !== undefined || dto.title !== undefined) {
      data.slug = await this.resolveSlug(
        dto.title ?? existing.title,
        dto.slug ?? existing.slug,
        id,
      );
    }
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.price !== undefined) data.price = dto.price;
    if (dto.currency !== undefined) data.currency = dto.currency;
    if (dto.examType !== undefined) data.examType = dto.examType;
    if (dto.mostPopular !== undefined) data.mostPopular = dto.mostPopular;
    if (dto.rating !== undefined) data.rating = dto.rating;
    if (dto.skills !== undefined) data.skills = dto.skills as Prisma.InputJsonValue;
    if (dto.included !== undefined)
      data.included = dto.included as Prisma.InputJsonValue;
    if (dto.rules !== undefined) data.rules = dto.rules as Prisma.InputJsonValue;
    if (dto.listeningTestId !== undefined)
      data.listeningTest = dto.listeningTestId
        ? { connect: { id: dto.listeningTestId } }
        : { disconnect: true };
    if (dto.readingTestId !== undefined)
      data.readingTest = dto.readingTestId
        ? { connect: { id: dto.readingTestId } }
        : { disconnect: true };
    if (dto.writingTestId !== undefined)
      data.writingTest = dto.writingTestId
        ? { connect: { id: dto.writingTestId } }
        : { disconnect: true };
    if (dto.speakingBankId !== undefined)
      data.speakingBank = dto.speakingBankId
        ? { connect: { id: dto.speakingBankId } }
        : { disconnect: true };
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    const updated = await this.prisma.mockTestPackage.update({ where: { id }, data });

    await this.audit.log({
      userId: actorId,
      action: AuditAction.ADMIN_PACKAGE_UPDATE,
      entity: 'mock_test_package',
      entityId: id,
      metadata: { fields: Object.keys(dto) },
    });

    return updated;
  }

  async deletePackage(id: string, actorId: string) {
    const pkg = await this.prisma.mockTestPackage.findUnique({
      where: { id },
      include: { _count: { select: { enrollments: true, orders: true } } },
    });
    if (!pkg) throw new NotFoundException('Package not found');

    // Preserve referential history: archive packages that have activity.
    if (pkg._count.enrollments > 0 || pkg._count.orders > 0) {
      await this.prisma.mockTestPackage.update({
        where: { id },
        data: { isActive: false },
      });
      await this.audit.log({
        userId: actorId,
        action: AuditAction.ADMIN_PACKAGE_DELETE,
        entity: 'mock_test_package',
        entityId: id,
        metadata: { archived: true },
      });
      return { archived: true };
    }

    await this.prisma.mockTestPackage.delete({ where: { id } });
    await this.audit.log({
      userId: actorId,
      action: AuditAction.ADMIN_PACKAGE_DELETE,
      entity: 'mock_test_package',
      entityId: id,
      metadata: { deleted: true },
    });
    return { deleted: true };
  }

  // ─── Disputes ────────────────────────────────────────────────────────────

  async updateTicket(id: string, dto: UpdateTicketDto, actorId: string) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found');

    const data: Prisma.SupportTicketUpdateInput = {};
    if (dto.priority !== undefined) data.priority = dto.priority;
    if (dto.assigneeId !== undefined) {
      data.assignee = dto.assigneeId
        ? { connect: { id: dto.assigneeId } }
        : { disconnect: true };
    }
    if (dto.status !== undefined) {
      data.status = dto.status;
      if (dto.status === 'RESOLVED' || dto.status === 'CLOSED') {
        data.resolvedAt = new Date();
        data.slaState = 'ON_TRACK';
        data.slaProgress = 100;
      }
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No changes supplied');
    }

    const updated = await this.prisma.supportTicket.update({ where: { id }, data });

    await this.audit.log({
      userId: actorId,
      action: AuditAction.ADMIN_TICKET_UPDATE,
      entity: 'support_ticket',
      entityId: id,
      metadata: {
        status: dto.status,
        priority: dto.priority,
        assigneeId: dto.assigneeId,
      },
    });

    return updated;
  }

  // ─── Orders & Refunds ────────────────────────────────────────────────────

  async refundOrder(orderId: string, dto: RefundOrderDto, actorId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        refunds: true,
        student: { include: { user: true } },
        enrollment: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== 'PAID') {
      throw new BadRequestException('Only paid orders can be refunded');
    }

    const refundAmount = dto.amount ?? order.amount;
    if (refundAmount <= 0 || refundAmount > order.amount) {
      throw new BadRequestException('Invalid refund amount');
    }

    const enrollment = order.enrollment;

    const [refund] = await this.prisma.$transaction(async (tx) => {
      const created = await tx.refund.create({
        data: {
          orderId: order.id,
          amount: refundAmount,
          reason: dto.reason ?? null,
        },
      });

      await tx.order.update({
        where: { id: order.id },
        data: { status: 'REFUNDED' },
      });

      if (
        enrollment &&
        enrollment.status !== EnrollmentStatus.COMPLETED &&
        enrollment.status !== EnrollmentStatus.CANCELLED
      ) {
        await tx.enrollment.update({
          where: { id: enrollment.id },
          data: { status: EnrollmentStatus.CANCELLED },
        });

        if (enrollment.speakingSlotId) {
          await tx.teacherSlot.updateMany({
            where: { id: enrollment.speakingSlotId },
            data: { status: SlotStatus.AVAILABLE, version: { increment: 1 } },
          });
        }
      }

      return [created];
    });

    await this.notifications.create(
      order.student.userId,
      'Refund processed',
      `A refund of $${refundAmount.toFixed(2)} has been issued for order ${order.orderCode}.`,
      NotificationType.PAYMENT,
      '/student/profile',
    );

    await this.audit.log({
      userId: actorId,
      action: AuditAction.ADMIN_ORDER_REFUND,
      entity: 'order',
      entityId: order.id,
      metadata: {
        orderCode: order.orderCode,
        refundAmount,
        reason: dto.reason ?? null,
      },
    });

    return {
      refundId: refund.id,
      orderId: order.orderCode,
      amount: refundAmount,
      status: 'refunded',
    };
  }

  // ─── Teacher Payouts ─────────────────────────────────────────────────────

  async getPayouts() {
    const payouts = await this.prisma.payout.findMany({
      include: { teacher: { include: { user: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return payouts.map((p) => ({
      id: p.id,
      teacherId: p.teacherId,
      teacherName: p.teacher.user.name,
      amount: p.amount,
      currency: p.currency,
      status: p.status.toLowerCase(),
      periodStart: p.periodStart,
      periodEnd: p.periodEnd,
      paidAt: p.paidAt,
      createdAt: p.createdAt,
    }));
  }

  async updatePayout(id: string, dto: UpdatePayoutDto, actorId: string) {
    const payout = await this.prisma.payout.findUnique({
      where: { id },
      include: { teacher: { include: { user: true } } },
    });
    if (!payout) throw new NotFoundException('Payout not found');

    const data: Prisma.PayoutUpdateInput = { status: dto.status };
    if (dto.status === 'PAID') {
      data.paidAt = new Date();
    }
    if (dto.status === 'PENDING' || dto.status === 'PROCESSING') {
      data.paidAt = null;
    }

    const updated = await this.prisma.payout.update({ where: { id }, data });

    await this.audit.log({
      userId: actorId,
      action: AuditAction.ADMIN_PAYOUT_UPDATE,
      entity: 'payout',
      entityId: id,
      metadata: { status: dto.status, amount: payout.amount },
    });

    if (dto.status === 'PAID' || dto.status === 'FAILED') {
      const title =
        dto.status === 'PAID' ? 'Payout processed' : 'Payout failed';
      const body =
        dto.status === 'PAID'
          ? `$${payout.amount.toFixed(2)} has been marked as paid for the period ending ${payout.periodEnd.toLocaleDateString()}.`
          : `Your payout of $${payout.amount.toFixed(2)} could not be processed. Update your bank details or contact support.`;

      await this.notifications.create(
        payout.teacher.userId,
        title,
        body,
        NotificationType.SYSTEM,
        '/teacher/earnings',
      );
    }

    return updated;
  }

  // ─── Band Conversion Table ───────────────────────────────────────────────

  async getBandTable() {
    const rows = await this.prisma.bandConversionTable.findMany({
      where: { isActive: true },
      orderBy: [{ skill: 'asc' }, { rawScore: 'desc' }],
    });

    return rows.map((r) => ({
      id: r.id,
      skill: r.skill,
      rawScore: r.rawScore,
      band: r.band,
    }));
  }

  async updateBandTable(dto: UpdateBandTableDto, actorId: string) {
    await this.prisma.$transaction(async (tx) => {
      await tx.bandConversionTable.updateMany({ data: { isActive: false } });
      for (const row of dto.rows) {
        await tx.bandConversionTable.upsert({
          where: {
            skill_rawScore: { skill: row.skill, rawScore: row.rawScore },
          },
          create: {
            skill: row.skill,
            rawScore: row.rawScore,
            band: row.band,
            isActive: true,
          },
          update: { band: row.band, isActive: true },
        });
      }
    });

    await this.audit.log({
      userId: actorId,
      action: AuditAction.ADMIN_BAND_TABLE_UPDATE,
      entity: 'band_conversion_table',
      metadata: { rowCount: dto.rows.length },
    });

    return this.getBandTable();
  }

  async getAuditLogs(params: { take?: number; skip?: number; entity?: string }) {
    return this.audit.list(params);
  }
}
