import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ContentTestStatus,
  EnrollmentStatus,
  ExamSessionState,
  ExamSkill,
  ExamType,
  NotificationType,
  Prisma,
  ResultsStatus,
  SlotStatus,
  UserRole,
} from '@prisma/client';
import {
  ACTIVE_PACKAGE_ENROLLMENT_STATUSES,
  activeEnrollmentsBlockContentRelease,
  EXCLUSIVE_PACKAGE_SKILLS,
} from './package-lifecycle';
import { purgeEnrollments } from './enrollment-cleanup';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditAction } from '../../common/audit/audit.actions';
import { AuditService } from '../../common/audit/audit.service';
import { helpPathForReporter } from '../../common/support/support-routing';
import {
  lookupBandFromRawScore,
  overallBandFromSkillBands,
  resolveAttemptBand,
} from '../../common/band-resolution';
import { CATALOG_CURRENCY } from '../../common/catalog-pricing';
import { tierDefaultsForBands } from '../../common/examiner-rate-tiers';
import { formatMoney } from '../../common/format-money';
import { MailService } from '../../common/mail/mail.service';
import { BookingsService } from '../bookings/bookings.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SettingsService } from '../settings/settings.service';
import { ExamSessionsService } from '../exam-sessions/exam-sessions.service';
import { WritingAiEvaluationService } from '../grading/writing-ai-evaluation.service';
import {
  WritingPdfService,
  type WritingTaskPdfData,
} from '../grading/writing-pdf.service';
import { WRITING_MIN_WORDS } from '../grading/writing-word-count';
import { ResultsPdfService } from '../results/results-pdf.service';
import {
  SECTION_DURATIONS_SEC,
  skillForActiveState,
} from '../exam-sessions/exam-state-machine';
import { UpdateBandTableDto } from './dto/band-table.dto';
import { GrantEnrollmentDto } from './dto/grant-enrollment.dto';
import { ReappointEnrollmentDto } from './dto/reappoint-enrollment.dto';
import { UpdateGrantEnrollmentDto } from './dto/update-grant-enrollment.dto';
import { CreatePackageDto, UpdatePackageDto } from './dto/package.dto';
import { RefundOrderDto } from './dto/refund-order.dto';
import { UpdatePayoutDto } from './dto/update-payout.dto';
import { UpdateTeacherRatesDto } from './dto/update-teacher-rates.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import {
  derivePackageKind,
  formatMockNumber,
  packageKindLabel,
  SKILL_TO_POOL_KEY,
  SKILL_TO_TEST_FIELD,
} from '../../common/package-kind';
import { suggestPackageTitle } from '../../common/package-naming';
import { getPackageContentTemplate } from '../../common/package-templates';
import { packageExamSkills } from '../content/package-skills';
import {
  findContentTestPackageAssignments,
  groupAssignmentsByTestId,
  summarizeAssignmentsForTest,
} from '../content/content-package-assignments';
import { filterPackagesAvailableToStudent } from '../content/content-assignment';
import { hasExamStarted } from '../../common/mock-day-policy';

const SKILL_ACCENTS = [
  { id: 'listening', name: 'Listening', detail: '~32 min · plays once', badge: 'Auto-scored', color: 'sky' },
  { id: 'reading', name: 'Reading', detail: '60 min · 3 passages', badge: 'Auto-scored', color: 'emerald' },
  { id: 'writing', name: 'Writing', detail: 'Task 1 + Task 2', badge: 'Teacher-graded', color: 'violet' },
  { id: 'speaking', name: 'Speaking', detail: 'Live · 11–14 min', badge: 'Teacher-graded', color: 'rose' },
];

/** Canonical skill ids stored on packages — never use SKILL_ACCENTS objects here. */
const DEFAULT_PACKAGE_SKILLS = ['listening', 'reading', 'writing', 'speaking'];

const INTEGRITY_FLAG_EVENTS = new Set([
  'tab_switch',
  'paste_attempt',
  'fullscreen_exit',
  'audio_seek_attempt',
]);

const ACTIVE_EXAM_STATES = [
  'LISTENING_ACTIVE',
  'READING_ACTIVE',
  'WRITING_ACTIVE',
  'SPEAKING_ACTIVE',
] as const;

const DASHBOARD_SKILLS: {
  skill: ExamSkill;
  label: string;
  color: 'sky' | 'emerald' | 'violet' | 'rose';
}[] = [
  { skill: ExamSkill.LISTENING, label: 'Listening', color: 'sky' },
  { skill: ExamSkill.READING, label: 'Reading', color: 'emerald' },
  { skill: ExamSkill.WRITING, label: 'Writing', color: 'violet' },
  { skill: ExamSkill.SPEAKING, label: 'Speaking', color: 'rose' },
];

function monthStart(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function monthEnd(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1);
}

function formatMonthShort(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short' });
}

/** Month-over-month change label for revenue summary cards. */
function formatRevenueTrend(monthly: { amount: number }[]): string {
  if (monthly.length < 2) return '—';
  const prev = monthly[monthly.length - 2]?.amount ?? 0;
  const curr = monthly[monthly.length - 1]?.amount ?? 0;
  if (prev === 0 && curr === 0) return '—';
  if (prev === 0) return '+100%';
  const pct = Math.round(((curr - prev) / prev) * 100);
  if (pct === 0) return '0%';
  return `${pct > 0 ? '+' : ''}${pct}%`;
}

type ReportTimeframe = 'jun' | 'q2' | 'ytd';

const REPORT_BAND_BUCKETS = [5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9] as const;
const PASS_BAND_THRESHOLD = 6;

const REPORT_ENROLLMENT_INCLUDE = {
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

type ReportEnrollment = Prisma.EnrollmentGetPayload<{
  include: typeof REPORT_ENROLLMENT_INCLUDE;
}>;

function normalizeReportTimeframe(value?: string): ReportTimeframe {
  const v = (value ?? 'jun').toLowerCase();
  if (v === 'q2' || v === 'ytd') return v;
  return 'jun';
}

function resolveReportPeriod(timeframe: ReportTimeframe, anchor: Date) {
  const year = anchor.getFullYear();
  if (timeframe === 'jun') {
    const start = new Date(year, 5, 1);
    const end = monthEnd(new Date(year, 5, 1));
    return {
      start,
      end,
      label: `June ${year}`,
      revenueLabel: 'June revenue',
      examsPeriod: 'Completed mocks in June',
    };
  }
  if (timeframe === 'q2') {
    const start = new Date(year, 3, 1);
    const end = monthEnd(new Date(year, 5, 1));
    return {
      start,
      end,
      label: `Q2 ${year}`,
      revenueLabel: 'Q2 revenue',
      examsPeriod: 'Completed mocks in Q2',
    };
  }
  const start = new Date(year, 0, 1);
  const end = monthEnd(anchor);
  return {
    start,
    end,
    label: 'Year to date',
    revenueLabel: 'YTD revenue',
    examsPeriod: 'Completed mocks YTD',
  };
}

function previousReportPeriod(start: Date, end: Date) {
  const durationMs = end.getTime() - start.getTime();
  return {
    start: new Date(start.getTime() - durationMs),
    end: new Date(start.getTime()),
  };
}

function pctChangeLabel(current: number, previous: number): string {
  if (previous === 0 && current === 0) return '—';
  if (previous === 0) return '+100%';
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return '0%';
  return `${pct > 0 ? '+' : ''}${pct}%`;
}

function reportAttemptBand(attempt: {
  skill: ExamSkill;
  band: number | null;
  writingSubmission: { grade: { overallBand: number } | null } | null;
  speakingSession: { grade: { overallBand: number } | null } | null;
}): number | null {
  if (attempt.skill === ExamSkill.WRITING) {
    return attempt.writingSubmission?.grade?.overallBand ?? attempt.band;
  }
  if (attempt.skill === ExamSkill.SPEAKING) {
    return attempt.speakingSession?.grade?.overallBand ?? attempt.band;
  }
  return attempt.band;
}

function reportEnrollmentOverallBand(enrollment: ReportEnrollment): number | null {
  const attempts = enrollment.examSession?.sectionAttempts ?? [];
  const bands = attempts.map((attempt) => reportAttemptBand(attempt));
  return overallBandFromSkillBands(bands);
}

/** Seed demo teacher emails / amounts from prisma/seed.ts — never real earnings. */
const SEED_DEMO_TEACHER_EMAILS = [
  'teacher@example.com',
  'emma.williams@example.com',
  'daniel.whitfield@example.com',
] as const;
const SEED_DEMO_PAYOUT_AMOUNTS = [325, 210, 890] as const;

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
    private mail: MailService,
    private settings: SettingsService,
    private bookings: BookingsService,
    private examSessions: ExamSessionsService,
    private resultsPdf: ResultsPdfService,
    private writingPdf: WritingPdfService,
    private writingAi: WritingAiEvaluationService,
  ) {}

  async getNavBadges() {
    const [liveSessions, openTickets] = await Promise.all([
      this.prisma.examSession.count({
        where: { state: { in: [...ACTIVE_EXAM_STATES] } },
      }),
      this.prisma.supportTicket.count({
        where: {
          institutionId: null,
          status: { in: ['OPEN', 'IN_PROGRESS'] },
        },
      }),
    ]);

    return { liveSessions, openTickets };
  }

  async getDashboard() {
    const syncedAt = new Date();
    const currentMonthStart = monthStart(syncedAt);
    const currentMonthEnd = monthEnd(syncedAt);
    const revenueWindowStart = monthStart(
      new Date(syncedAt.getFullYear(), syncedAt.getMonth() - 5, 1),
    );

    const [
      totalEnrollments,
      totalRevenue,
      openTickets,
      liveSessions,
      monthlyOrders,
      enrollmentsThisMonth,
    ] = await Promise.all([
      this.prisma.enrollment.count(),
      this.prisma.order.aggregate({
        where: {
          status: 'PAID',
          paymentMethod: { not: 'COMPLIMENTARY' },
        },
        _sum: { amount: true },
      }),
      this.prisma.supportTicket.count({
        where: {
          institutionId: null,
          status: { in: ['OPEN', 'IN_PROGRESS'] },
        },
      }),
      this.getLiveSessions(),
      this.prisma.order.findMany({
        where: {
          status: 'PAID',
          paymentMethod: { not: 'COMPLIMENTARY' },
          createdAt: { gte: revenueWindowStart },
        },
        select: { amount: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.enrollment.findMany({
        where: {
          mockDate: { gte: currentMonthStart, lt: currentMonthEnd },
        },
        include: {
          examSession: { include: { sectionAttempts: true } },
        },
      }),
    ]);

    return {
      kpis: {
        totalEnrollments,
        activeExams: liveSessions.length,
        totalRevenue: totalRevenue._sum.amount ?? 0,
        openTickets,
      },
      liveSessions,
      monthlyRevenue: this.buildMonthlyRevenue(monthlyOrders, syncedAt),
      completionRates: this.buildCompletionRates(enrollmentsThisMonth),
      meta: {
        syncedAt: syncedAt.toISOString(),
        status: 'operational',
      },
      navBadges: {
        liveSessions: liveSessions.length,
        openTickets,
      },
    };
  }

  private buildMonthlyRevenue(
    orders: { amount: number; createdAt: Date }[],
    anchor: Date,
  ) {
    const buckets: {
      key: string;
      month: string;
      amount: number;
      orderCount: number;
    }[] = [];
    for (let offset = 5; offset >= 0; offset -= 1) {
      const d = new Date(anchor.getFullYear(), anchor.getMonth() - offset, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      buckets.push({ key, month: formatMonthShort(d), amount: 0, orderCount: 0 });
    }

    const bucketMap = new Map(buckets.map((b) => [b.key, b]));
    for (const order of orders) {
      const key = `${order.createdAt.getFullYear()}-${String(order.createdAt.getMonth() + 1).padStart(2, '0')}`;
      const bucket = bucketMap.get(key);
      if (bucket) {
        bucket.amount += order.amount;
        bucket.orderCount += 1;
      }
    }

    return buckets.map(({ month, amount, orderCount }) => ({
      month,
      amount: Math.round(amount * 100) / 100,
      orderCount,
    }));
  }

  private buildMonthlyRevenueForRange(
    orders: { amount: number; createdAt: Date }[],
    start: Date,
    end: Date,
  ) {
    const buckets: {
      key: string;
      month: string;
      amount: number;
      orderCount: number;
    }[] = [];

    let cursor = monthStart(start);
    while (cursor < end) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
      buckets.push({ key, month: formatMonthShort(cursor), amount: 0, orderCount: 0 });
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }

    const bucketMap = new Map(buckets.map((b) => [b.key, b]));
    for (const order of orders) {
      if (order.createdAt < start || order.createdAt >= end) continue;
      const key = `${order.createdAt.getFullYear()}-${String(order.createdAt.getMonth() + 1).padStart(2, '0')}`;
      const bucket = bucketMap.get(key);
      if (bucket) {
        bucket.amount += order.amount;
        bucket.orderCount += 1;
      }
    }

    return buckets.map(({ month, amount, orderCount }) => ({
      month,
      amount: Math.round(amount * 100) / 100,
      orderCount,
    }));
  }

  private buildEnrollmentFunnelForRange(
    enrollments: { createdAt: Date; updatedAt: Date; status: EnrollmentStatus }[],
    start: Date,
    end: Date,
  ) {
    const buckets: {
      key: string;
      month: string;
      enrolled: number;
      completed: number;
    }[] = [];

    let cursor = monthStart(start);
    while (cursor < end) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
      buckets.push({ key, month: formatMonthShort(cursor), enrolled: 0, completed: 0 });
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }

    const bucketMap = new Map(buckets.map((b) => [b.key, b]));
    for (const enrollment of enrollments) {
      if (enrollment.createdAt >= start && enrollment.createdAt < end) {
        const key = `${enrollment.createdAt.getFullYear()}-${String(enrollment.createdAt.getMonth() + 1).padStart(2, '0')}`;
        bucketMap.get(key)!.enrolled += 1;
      }
      if (
        enrollment.status === EnrollmentStatus.COMPLETED &&
        enrollment.updatedAt >= start &&
        enrollment.updatedAt < end
      ) {
        const key = `${enrollment.updatedAt.getFullYear()}-${String(enrollment.updatedAt.getMonth() + 1).padStart(2, '0')}`;
        bucketMap.get(key)!.completed += 1;
      }
    }

    return buckets.map(({ month, enrolled, completed }) => ({
      month,
      enrolled,
      completed,
    }));
  }

  private buildCompletionRates(
    enrollments: {
      examSession: {
        sectionAttempts: { skill: ExamSkill; submittedAt: Date | null }[];
      } | null;
    }[],
  ) {
    const total = enrollments.length;
    return DASHBOARD_SKILLS.map(({ skill, label, color }) => {
      if (total === 0) {
        return { skill: label, pct: 0, color };
      }
      const completed = enrollments.filter((enrollment) =>
        enrollment.examSession?.sectionAttempts.some(
          (attempt) => attempt.skill === skill && attempt.submittedAt != null,
        ),
      ).length;
      return {
        skill: label,
        pct: Math.round((completed / total) * 100),
        color,
      };
    });
  }

  async getLiveSessions() {
    const sessions = await this.prisma.examSession.findMany({
      where: {
        state: { in: [...ACTIVE_EXAM_STATES] },
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
      MISSED: 'missed',
    };

    return {
      summary: {
        total: enrollments.length,
        activeExams: enrollments.filter((e) => e.status === 'IN_PROGRESS')
          .length,
        awaitingResults: enrollments.filter(
          (e) => e.status === 'AWAITING_RESULTS',
        ).length,
        missed: enrollments.filter((e) => e.status === 'MISSED').length,
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
        adminGranted: e.adminGranted,
        lifecycle: lifecycleMap[e.status] ?? 'in_progress',
      })),
    };
  }

  async getEnrollmentDetail(enrollmentId: string) {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        OR: [{ id: enrollmentId }, { enrollmentCode: enrollmentId }],
      },
      include: {
        student: { include: { user: true } },
        package: true,
        examSession: {
          include: {
            sectionAttempts: {
              include: {
                contentTest: { select: { id: true, code: true, title: true } },
                writingSubmission: { include: { grade: true } },
                speakingSession: { include: { grade: true } },
              },
            },
          },
        },
      },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');

    const lifecycleMap: Record<string, string> = {
      ENROLLED: 'in_progress',
      IN_PROGRESS: 'in_progress',
      AWAITING_RESULTS: 'awaiting_results',
      COMPLETED: 'complete',
      CANCELLED: 'complete',
    };

    const packageSkills = packageExamSkills(enrollment.package.skills);
    const attempts = enrollment.examSession?.sectionAttempts ?? [];

    const skills = await Promise.all(
      packageSkills.map(async (skill) => {
        const attempt = attempts.find((a) => a.skill === skill);
        const grade =
          attempt?.writingSubmission?.grade ??
          attempt?.speakingSession?.grade;
        const band = attempt
          ? await resolveAttemptBand(this.prisma, {
              skill: attempt.skill,
              band: attempt.band ?? grade?.overallBand ?? null,
              rawScore: attempt.rawScore,
            })
          : null;
        return {
          skill: skill.toLowerCase(),
          submitted: attempt?.submittedAt != null,
          rawScore: attempt?.rawScore ?? null,
          band,
          contentTest: attempt?.contentTest
            ? {
                id: attempt.contentTest.id,
                code: attempt.contentTest.code,
                title: attempt.contentTest.title,
              }
            : null,
        };
      }),
    );

    const overallBand = overallBandFromSkillBands(skills.map((s) => s.band));

    return {
      id: enrollment.id,
      enrollmentId: enrollment.enrollmentCode,
      studentName: enrollment.student.user.name,
      packageTitle: enrollment.package.title,
      examDate: enrollment.mockDate,
      examTime: enrollment.mockTime,
      lifecycle: lifecycleMap[enrollment.status] ?? 'in_progress',
      resultsStatus: enrollment.resultsStatus.toLowerCase(),
      overallBand,
      skills,
    };
  }

  async rescoreEnrollment(enrollmentId: string, actorId: string) {
    const result =
      await this.examSessions.rescoreListeningReadingForEnrollment(enrollmentId);

    if (result.rescored.length > 0) {
      await this.resultsPdf.generateForEnrollment(enrollmentId);
    }

    await this.audit.log({
      userId: actorId,
      action: AuditAction.ADMIN_SCORE_RESCORE,
      entity: 'enrollment',
      entityId: enrollmentId,
      metadata: { updates: result.rescored },
    });

    return result;
  }

  async rescoreAllListeningReading(actorId: string) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        examSession: {
          sectionAttempts: {
            some: {
              skill: { in: [ExamSkill.LISTENING, ExamSkill.READING] },
              submittedAt: { not: null },
            },
          },
        },
      },
      select: { id: true },
    });

    let updated = 0;
    for (const e of enrollments) {
      const result =
        await this.examSessions.rescoreListeningReadingForEnrollment(e.id);
      if (result.rescored.length > 0) {
        updated++;
        await this.resultsPdf.generateForEnrollment(e.id);
      }
    }

    await this.audit.log({
      userId: actorId,
      action: AuditAction.ADMIN_SCORE_RESCORE,
      entity: 'enrollment',
      entityId: 'bulk',
      metadata: { total: enrollments.length, updated },
    });

    return { total: enrollments.length, updated };
  }

  async overrideSectionScore(
    enrollmentId: string,
    skill: 'listening' | 'reading' | 'writing' | 'speaking',
    body: { band?: number; rawScore?: number; reason?: string },
    actorId: string,
  ) {
    const targetSkill = skill.toUpperCase() as ExamSkill;
    const isAutoScored =
      targetSkill === ExamSkill.LISTENING || targetSkill === ExamSkill.READING;

    let band = body.band;
    if (isAutoScored && body.rawScore != null) {
      const computed = await lookupBandFromRawScore(
        this.prisma,
        targetSkill,
        body.rawScore,
      );
      if (computed == null) {
        throw new BadRequestException(
          `Could not resolve band for raw score ${body.rawScore}`,
        );
      }
      band = computed;
    }

    if (band == null || band < 0 || band > 9 || band % 0.5 !== 0) {
      throw new BadRequestException(
        'Band must be between 0 and 9 in 0.5 steps',
      );
    }
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
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
      },
    });
    if (!enrollment?.examSession) {
      throw new NotFoundException('Enrollment not found');
    }

    const attempt = enrollment.examSession.sectionAttempts.find(
      (a) => a.skill === targetSkill,
    );
    if (!attempt) {
      throw new BadRequestException(`No ${skill} section found`);
    }

    const previous = { band: attempt.band, rawScore: attempt.rawScore };

    await this.prisma.$transaction(async (tx) => {
      await tx.sectionAttempt.update({
        where: { id: attempt.id },
        data: {
          band,
          ...(isAutoScored && body.rawScore != null
            ? { rawScore: body.rawScore }
            : {}),
        },
      });

      if (targetSkill === ExamSkill.WRITING && attempt.writingSubmission?.grade) {
        await tx.grade.update({
          where: { id: attempt.writingSubmission.grade.id },
          data: { overallBand: band },
        });
      }

      if (targetSkill === ExamSkill.SPEAKING && attempt.speakingSession?.grade) {
        await tx.grade.update({
          where: { id: attempt.speakingSession.grade.id },
          data: { overallBand: band },
        });
      }
    });

    await this.resultsPdf.generateForEnrollment(enrollmentId);

    await this.audit.log({
      userId: actorId,
      action: AuditAction.ADMIN_SCORE_OVERRIDE,
      entity: 'enrollment',
      entityId: enrollmentId,
      metadata: { skill, band, rawScore: body.rawScore, reason: body.reason, previous },
    });

    return { updated: true, skill, band };
  }

  async exportEnrollmentPdfs(enrollmentIds: string[], actorId: string) {
    if (enrollmentIds.length === 0) {
      throw new BadRequestException('Select at least one enrollment');
    }
    if (enrollmentIds.length > 100) {
      throw new BadRequestException('Maximum 100 enrollments per export');
    }

    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        OR: [
          { id: { in: enrollmentIds } },
          { enrollmentCode: { in: enrollmentIds } },
        ],
        resultsStatus: 'RELEASED',
      },
      select: { id: true, enrollmentCode: true },
      orderBy: { enrollmentCode: 'asc' },
    });

    if (enrollments.length === 0) {
      throw new BadRequestException(
        'No released results found for the selected enrollments',
      );
    }

    for (const e of enrollments) {
      const existing = await this.resultsPdf.readPdfBuffer(e.id);
      if (!existing) {
        await this.resultsPdf.generateForEnrollment(e.id);
      }
    }

    const buffer = await this.resultsPdf.buildBulkPdf(
      enrollments.map((e) => e.id),
    );
    if (!buffer) {
      throw new BadRequestException('Could not generate PDF export');
    }

    await this.audit.log({
      userId: actorId,
      action: AuditAction.ADMIN_RESULTS_EXPORT,
      entity: 'enrollment',
      entityId: 'bulk',
      metadata: {
        count: enrollments.length,
        codes: enrollments.map((e) => e.enrollmentCode),
      },
    });

    return {
      buffer,
      filename: `itestu-reports-${enrollments.length}-students.pdf`,
      count: enrollments.length,
    };
  }

  async exportWritingPdfs(
    enrollmentIds: string[],
    tasks: ('task1' | 'task2')[],
    actorId: string,
    waitForAi = true,
  ) {
    if (enrollmentIds.length === 0) {
      throw new BadRequestException('Select at least one enrollment');
    }
    if (enrollmentIds.length > 50) {
      throw new BadRequestException('Maximum 50 enrollments per writing export');
    }
    if (!tasks.length) {
      throw new BadRequestException('Select at least one writing task');
    }

    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        OR: [
          { id: { in: enrollmentIds } },
          { enrollmentCode: { in: enrollmentIds } },
        ],
      },
      include: {
        student: { include: { user: true } },
        examSession: {
          include: {
            sectionAttempts: {
              where: { skill: ExamSkill.WRITING },
              include: {
                contentTest: { select: { content: true } },
                writingSubmission: {
                  include: {
                    grade: true,
                    aiEvaluation: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { enrollmentCode: 'asc' },
    });

    const reports: WritingTaskPdfData[] = [];

    for (const enrollment of enrollments) {
      const writingAttempt = enrollment.examSession?.sectionAttempts.find(
        (a) => a.skill === ExamSkill.WRITING,
      );
      const submission = writingAttempt?.writingSubmission;
      if (!submission) continue;

      if (waitForAi && this.writingAi.isConfigured()) {
        await this.writingAi.waitForEvaluation(submission.id, 45_000);
      } else {
        void this.writingAi.getOrTriggerEvaluation(submission.id);
      }

      const refreshed = await this.prisma.writingSubmission.findUnique({
        where: { id: submission.id },
        include: { grade: true, aiEvaluation: true },
      });
      if (!refreshed) continue;

      const content = writingAttempt.contentTest?.content as
        | {
            tasks?: {
              taskNumber?: number;
              prompt?: string;
              visual?: { caption?: string };
            }[];
          }
        | undefined;
      const taskDefs = content?.tasks ?? [];
      const task1Def = taskDefs.find((t) => t.taskNumber === 1);
      const task2Def = taskDefs.find((t) => t.taskNumber === 2);

      const criteria = refreshed.grade?.criteriaScores as
        | {
            task1?: Record<string, number | string | undefined>;
            task2?: Record<string, number | string | undefined>;
          }
        | null
        | undefined;

      const ai = refreshed.aiEvaluation;
      const aiStatus = ai?.status?.toLowerCase() ?? 'pending';

      if (tasks.includes('task1')) {
        reports.push({
          studentName: enrollment.student.user.name,
          enrollmentCode: enrollment.enrollmentCode,
          mockDate: enrollment.mockDate,
          taskNumber: 1,
          prompt: task1Def?.prompt ?? 'Task 1 prompt unavailable',
          visualCaption: task1Def?.visual?.caption ?? null,
          essayText: refreshed.task1Text ?? '',
          wordCount: refreshed.task1WordCount,
          minWords: WRITING_MIN_WORDS.task1,
          annotations: (ai?.task1Annotations as WritingTaskPdfData['annotations']) ?? [],
          suggestedScores:
            (ai?.task1SuggestedScores as Record<string, number>) ?? null,
          criterionSummaries:
            (ai?.task1CriterionSummaries as WritingTaskPdfData['criterionSummaries']) ??
            null,
          examinerScores: criteria?.task1 ?? null,
          examinerTaskBand:
            typeof criteria?.task1?.taskBand === 'number'
              ? criteria.task1.taskBand
              : null,
          aiStatus,
        });
      }

      if (tasks.includes('task2')) {
        reports.push({
          studentName: enrollment.student.user.name,
          enrollmentCode: enrollment.enrollmentCode,
          mockDate: enrollment.mockDate,
          taskNumber: 2,
          prompt: task2Def?.prompt ?? 'Task 2 prompt unavailable',
          visualCaption: task2Def?.visual?.caption ?? null,
          essayText: refreshed.task2Text ?? '',
          wordCount: refreshed.task2WordCount,
          minWords: WRITING_MIN_WORDS.task2,
          annotations: (ai?.task2Annotations as WritingTaskPdfData['annotations']) ?? [],
          suggestedScores:
            (ai?.task2SuggestedScores as Record<string, number>) ?? null,
          criterionSummaries:
            (ai?.task2CriterionSummaries as WritingTaskPdfData['criterionSummaries']) ??
            null,
          examinerScores: criteria?.task2 ?? null,
          examinerTaskBand:
            typeof criteria?.task2?.taskBand === 'number'
              ? criteria.task2.taskBand
              : null,
          aiStatus,
        });
      }
    }

    if (!reports.length) {
      throw new BadRequestException(
        'No writing submissions found for the selected enrollments',
      );
    }

    const buffer = await this.writingPdf.buildBulkWritingPdf(reports);
    if (!buffer) {
      throw new BadRequestException('Could not generate writing PDF export');
    }

    const taskLabel = tasks.length === 2 ? 'task1-task2' : tasks[0];
    const studentCount = new Set(reports.map((r) => r.enrollmentCode)).size;

    await this.audit.log({
      userId: actorId,
      action: AuditAction.ADMIN_WRITING_EXPORT,
      entity: 'enrollment',
      entityId: 'bulk',
      metadata: {
        tasks,
        pages: reports.length,
        students: studentCount,
      },
    });

    return {
      buffer,
      filename: `itestu-writing-${taskLabel}-${studentCount}-students.pdf`,
      count: reports.length,
      students: studentCount,
    };
  }

  async getStudents() {
    const students = await this.prisma.studentProfile.findMany({
      include: {
        user: true,
        _count: { select: { enrollments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    const activeGrants = await this.prisma.enrollment.findMany({
      where: {
        adminGranted: true,
        status: EnrollmentStatus.ENROLLED,
        examStartedAt: null,
        mockDayCutoffAt: { gt: now },
        studentId: { in: students.map((s) => s.id) },
      },
      include: {
        package: { select: { id: true, title: true, skills: true } },
        writingTeacher: { include: { user: { select: { name: true } } } },
        speakingTeacher: { include: { user: { select: { name: true } } } },
        examSession: {
          include: { sectionAttempts: { select: { startedAt: true } } },
        },
      },
      orderBy: { mockDayCutoffAt: 'asc' },
    });

    const grantByStudent = new Map<string, (typeof activeGrants)[0]>();
    for (const grant of activeGrants) {
      if (
        hasExamStarted({
          checkInAt: grant.examSession?.checkInAt ?? null,
          sectionAttempts: grant.examSession?.sectionAttempts ?? [],
        })
      ) {
        continue;
      }
      if (!grantByStudent.has(grant.studentId)) {
        grantByStudent.set(grant.studentId, grant);
      }
    }

    return students.map((s) => {
      const grant = grantByStudent.get(s.id);
      const grantSkills = grant
        ? packageExamSkills(grant.package.skills).map((sk) => sk.toLowerCase())
        : [];

      return {
        id: s.id,
        name: s.user.name,
        email: s.user.email,
        targetBand: s.targetBand,
        examType: s.examType.toLowerCase(),
        country: s.country ?? null,
        emailVerified: s.user.emailVerifiedAt != null,
        enrollments: s._count.enrollments,
        createdAt: s.user.createdAt,
        activeAdminGrant: grant
          ? {
              enrollmentId: grant.id,
              enrollmentCode: grant.enrollmentCode,
              packageId: grant.packageId,
              packageTitle: grant.package.title,
              mockDate: grant.mockDate.toISOString(),
              mockDayCutoffAt: grant.mockDayCutoffAt?.toISOString() ?? null,
              writingTeacherId: grant.writingTeacherId,
              writingTeacherName: grant.writingTeacher?.user.name ?? null,
              speakingTeacherId: grant.speakingTeacherId,
              speakingTeacherName: grant.speakingTeacher?.user.name ?? null,
              needsWriting: grantSkills.includes('writing'),
              needsSpeaking: grantSkills.includes('speaking'),
            }
          : null,
      };
    });
  }

  /** Active packages a student may receive via complimentary grant or self-checkout. */
  async getGrantablePackagesForStudent(
    studentId: string,
    exceptEnrollmentId?: string,
  ) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { id: studentId },
      select: { id: true },
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const packages = await this.prisma.mockTestPackage.findMany({
      where: { isActive: true },
      orderBy: [{ mostPopular: 'desc' }, { title: 'asc' }],
    });

    const grantable = await filterPackagesAvailableToStudent(
      this.prisma,
      studentId,
      packages,
      exceptEnrollmentId ? { exceptEnrollmentId } : undefined,
    );

    return {
      packages: grantable.map((pkg) => ({
        id: pkg.id,
        title: pkg.title,
        slug: pkg.slug,
        price: pkg.price,
        currency: pkg.currency,
        skills: pkg.skills,
        mockLabel: formatMockNumber(pkg.packageKind, pkg.mockNumber),
      })),
    };
  }

  /**
   * Admin-initiated complimentary enrollment. Reuses the shared booking
   * provisioning so the granted mock behaves identically to a paid one
   * (speaking slot is locked and the appointed session appears in the teacher
   * panel), but the order is recorded as a 0 so'm COMPLIMENTARY payment.
   */
  async grantEnrollment(dto: GrantEnrollmentDto, actorId: string) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { id: dto.studentId },
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return this.bookings.provisionEnrollment({
      studentProfileId: dto.studentId,
      actorUserId: actorId,
      packageId: dto.packageId,
      mockDate: dto.mockDate,
      mockTime: dto.mockTime ?? null,
      mockDayCutoffTime: dto.mockDayCutoffTime,
      writingTeacherId: dto.writingTeacherId,
      speakingTeacherId: dto.speakingTeacherId,
      speakingSlotId: dto.speakingSlotId,
      complimentary: true,
      auditAction: AuditAction.ADMIN_ENROLLMENT_GRANT,
    });
  }

  async updateAdminGrant(
    enrollmentId: string,
    dto: UpdateGrantEnrollmentDto,
    actorId: string,
  ) {
    return this.bookings.updateAdminGrant(enrollmentId, dto, actorId);
  }

  async revokeAdminGrant(enrollmentId: string, actorId: string) {
    return this.bookings.revokeAdminGrant(enrollmentId, actorId);
  }

  async reappointEnrollment(dto: ReappointEnrollmentDto, actorId: string) {
    return this.bookings.reappointEnrollment(dto, actorId);
  }

  async getTeachers() {
    const teachers = await this.prisma.teacherProfile.findMany({
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });

    return teachers.map((t) => this.mapTeacherListItem(t));
  }

  async getTeacher(teacherId: string) {
    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { id: teacherId },
      include: { user: true },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    return this.mapTeacherDetail(teacher);
  }

  async updateTeacherStatus(
    teacherId: string,
    status: 'approved' | 'pending' | 'suspended',
    actorId: string,
  ) {
    const existing = await this.prisma.teacherProfile.findUnique({
      where: { id: teacherId },
      include: { user: true },
    });

    if (!existing) {
      throw new NotFoundException('Teacher not found');
    }

    const previousStatus = existing.status;
    const nextStatus = status.toUpperCase() as 'APPROVED' | 'PENDING' | 'SUSPENDED';

    if (previousStatus === 'PENDING' && nextStatus === 'APPROVED') {
      throw new BadRequestException(
        'Pending applications must be approved after reviewing certificates and setting payout rates.',
      );
    }

    let rateData: {
      approvedWritingRate?: number;
      approvedSpeakingRate?: number;
      platformSharePercent?: number;
    } = {};

    if (nextStatus === 'APPROVED') {
      const tiers = await this.settings.getBandTiers();
      const app = existing.applicationData as {
        ieltsWritingBand?: number;
        ieltsSpeakingBand?: number;
      } | null;
      const defaults = tierDefaultsForBands(
        tiers,
        app?.ieltsWritingBand ?? 7.5,
        app?.ieltsSpeakingBand ?? 7.5,
      );
      rateData = {
        approvedWritingRate:
          existing.approvedWritingRate ??
          existing.requestedWritingRate ??
          defaults.writing.defaultRate,
        approvedSpeakingRate:
          existing.approvedSpeakingRate ??
          existing.requestedSpeakingRate ??
          defaults.speaking.defaultRate,
        platformSharePercent:
          existing.platformSharePercent ?? defaults.writing.platformPercent,
      };
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const rejectionData =
        previousStatus === 'PENDING' && nextStatus === 'SUSPENDED'
          ? {
              applicationData: {
                ...((existing.applicationData as Record<string, unknown> | null) ??
                  {}),
                rejectedAt: new Date().toISOString(),
              },
            }
          : {};

      const teacher = await tx.teacherProfile.update({
        where: { id: teacherId },
        data: { status: nextStatus, ...rateData, ...rejectionData },
        include: { user: true },
      });

      if (nextStatus === 'APPROVED' && !teacher.user.emailVerifiedAt) {
        await tx.user.update({
          where: { id: teacher.userId },
          data: {
            emailVerifiedAt: new Date(),
            emailVerificationToken: null,
            emailVerificationExpires: null,
          },
        });
        teacher.user.emailVerifiedAt = new Date();
      }

      return teacher;
    });

    await this.audit.log({
      userId: actorId,
      action: AuditAction.ADMIN_TEACHER_STATUS,
      entity: 'teacher_profile',
      entityId: teacherId,
      metadata: { status, previousStatus: previousStatus.toLowerCase() },
    });

    void this.notifyTeacherStatusChange(
      updated.user.email,
      updated.user.name,
      previousStatus,
      updated.status,
    ).catch(() => undefined);

    return this.mapTeacherListItem(updated);
  }

  async updateTeacherRates(
    teacherId: string,
    dto: UpdateTeacherRatesDto,
    actorId: string,
  ) {
    const existing = await this.prisma.teacherProfile.findUnique({
      where: { id: teacherId },
      include: { user: true },
    });

    if (!existing) {
      throw new NotFoundException('Teacher not found');
    }

    const tiers = await this.settings.getBandTiers();
    const app = existing.applicationData as {
      ieltsWritingBand?: number;
      ieltsSpeakingBand?: number;
    } | null;
    const defaults = tierDefaultsForBands(
      tiers,
      app?.ieltsWritingBand ?? 7.5,
      app?.ieltsSpeakingBand ?? 7.5,
    );

    const approvedWritingRate =
      dto.approvedWritingRate ??
      existing.approvedWritingRate ??
      existing.requestedWritingRate ??
      defaults.writing.defaultRate;
    const approvedSpeakingRate =
      dto.approvedSpeakingRate ??
      existing.approvedSpeakingRate ??
      existing.requestedSpeakingRate ??
      defaults.speaking.defaultRate;
    const platformSharePercent =
      dto.platformSharePercent ??
      existing.platformSharePercent ??
      defaults.writing.platformPercent;

    const previousStatus = existing.status;
    const nextStatus = dto.status
      ? (dto.status.toUpperCase() as 'APPROVED' | 'PENDING' | 'SUSPENDED')
      : existing.status;

    const updated = await this.prisma.$transaction(async (tx) => {
      const teacher = await tx.teacherProfile.update({
        where: { id: teacherId },
        data: {
          approvedWritingRate,
          approvedSpeakingRate,
          platformSharePercent,
          ...(dto.status ? { status: nextStatus } : {}),
        },
        include: { user: true },
      });

      if (nextStatus === 'APPROVED' && !teacher.user.emailVerifiedAt) {
        await tx.user.update({
          where: { id: teacher.userId },
          data: {
            emailVerifiedAt: new Date(),
            emailVerificationToken: null,
            emailVerificationExpires: null,
          },
        });
        teacher.user.emailVerifiedAt = new Date();
      }

      return teacher;
    });

    await this.audit.log({
      userId: actorId,
      action: AuditAction.ADMIN_TEACHER_STATUS,
      entity: 'teacher_profile',
      entityId: teacherId,
      metadata: {
        approvedWritingRate,
        approvedSpeakingRate,
        platformSharePercent,
        status: dto.status ?? previousStatus.toLowerCase(),
      },
    });

    if (dto.status && nextStatus !== previousStatus) {
      void this.notifyTeacherStatusChange(
        updated.user.email,
        updated.user.name,
        previousStatus,
        updated.status,
      ).catch(() => undefined);
    }

    return this.mapTeacherDetail(updated);
  }

  private mapTeacherListItem(teacher: {
    id: string;
    status: string;
    rating: number | null;
    totalSessions: number;
    totalEarned: number;
    speciality: string;
    createdAt: Date;
    applicationData?: unknown;
    user: { name: string; email: string };
  }) {
    const app = teacher.applicationData as { rejectedAt?: string } | null;
    return {
      id: teacher.id,
      name: teacher.user.name,
      email: teacher.user.email,
      status: teacher.status.toLowerCase(),
      applicationRejected: Boolean(app?.rejectedAt),
      rating: teacher.rating,
      sessions: teacher.totalSessions,
      totalEarned: teacher.totalEarned,
      speciality: teacher.speciality.toLowerCase(),
      createdAt: teacher.createdAt,
    };
  }

  private mapTeacherDetail(teacher: {
    id: string;
    status: string;
    rating: number | null;
    totalSessions: number;
    totalEarned: number;
    speciality: string;
    createdAt: Date;
    bio: string | null;
    languages: unknown;
    credentials: unknown;
    applicationData: unknown;
    requestedWritingRate: number | null;
    requestedSpeakingRate: number | null;
    approvedWritingRate: number | null;
    approvedSpeakingRate: number | null;
    platformSharePercent: number | null;
    user: { name: string; email: string };
  }) {
    return {
      ...this.mapTeacherListItem(teacher),
      bio: teacher.bio,
      languages: teacher.languages,
      credentials: teacher.credentials,
      application: teacher.applicationData,
      requestedWritingRate: teacher.requestedWritingRate,
      requestedSpeakingRate: teacher.requestedSpeakingRate,
      approvedWritingRate: teacher.approvedWritingRate,
      approvedSpeakingRate: teacher.approvedSpeakingRate,
      platformSharePercent: teacher.platformSharePercent,
    };
  }

  private async notifyTeacherStatusChange(
    email: string,
    name: string,
    previousStatus: string,
    nextStatus: string,
  ) {
    const general = (await this.settings.getSection('general')) as {
      supportEmail?: string;
    };
    const supportEmail = general.supportEmail?.trim() || 'support@itestu.uz';

    if (nextStatus === 'APPROVED' && previousStatus === 'SUSPENDED') {
      await this.mail.sendTeacherReinstated(email, name);
      return;
    }

    if (nextStatus === 'APPROVED' && previousStatus !== 'APPROVED') {
      await this.mail.sendTeacherApproved(email, name);
      return;
    }

    if (nextStatus === 'SUSPENDED' && previousStatus === 'PENDING') {
      await this.mail.sendTeacherApplicationRejected(email, name, supportEmail);
      return;
    }

    if (nextStatus === 'SUSPENDED') {
      await this.mail.sendTeacherSuspended(email, name, supportEmail);
    }
  }

  async getOrders() {
    const [orders, monthlyOrders] = await Promise.all([
      this.prisma.order.findMany({
        include: {
          student: { include: { user: true } },
          package: true,
          enrollment: true,
          institution: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.findMany({
        where: {
          status: 'PAID',
          paymentMethod: { not: 'COMPLIMENTARY' },
          createdAt: {
            gte: new Date(
              new Date().getFullYear(),
              new Date().getMonth() - 5,
              1,
            ),
          },
        },
        select: { amount: true, createdAt: true },
      }),
    ]);

    const syncedAt = new Date();
    const monthlyRevenue = this.buildMonthlyRevenue(monthlyOrders, syncedAt);

    const mapped = orders.map((o) => {
      const paymentMethod = o.paymentMethod.toLowerCase();
      const rawStatus = o.status.toLowerCase();
      // Keep PAID in DB for fulfillment, but surface grants separately in admin.
      const status =
        rawStatus === 'paid' && paymentMethod === 'complimentary'
          ? 'complimentary'
          : rawStatus;

      return {
        id: o.id,
        orderId: o.orderCode,
        studentName:
          o.student?.user.name ?? o.institution?.name ?? '—',
        enrollmentRef: o.enrollment?.enrollmentCode,
        package:
          o.package?.title ??
          (o.creditQuantity ? `${o.creditQuantity} mock credits` : '—'),
        paymentMethod,
        amount: o.amount,
        status,
        createdAt: o.createdAt,
      };
    });

    const paid = mapped.filter((o) => o.status === 'paid');
    const refunded = mapped.filter((o) => o.status === 'refunded');
    const failed = mapped.filter((o) => o.status === 'failed');
    const pending = mapped.filter((o) => o.status === 'pending');

    return {
      orders: mapped,
      summary: {
        revenueCollected: paid.reduce((s, o) => s + o.amount, 0),
        revenueTrend: formatRevenueTrend(monthlyRevenue),
        paidOrders: paid.length,
        paidTotal: paid.reduce((s, o) => s + o.amount, 0),
        refundsIssued: refunded.length,
        refundTotal: refunded.reduce((s, o) => s + o.amount, 0),
        failedPayments: failed.length,
        pendingPayments: pending.length,
      },
      monthlyRevenue,
    };
  }

  async getDisputes() {
    const tickets = await this.prisma.supportTicket.findMany({
      where: { institutionId: null },
      include: this.disputeTicketInclude(),
      orderBy: { createdAt: 'desc' },
    });

    const enrollmentIds = tickets
      .map((t) => t.enrollmentId)
      .filter((id): id is string => Boolean(id));
    const orderByEnrollment = await this.ordersByEnrollmentIds(enrollmentIds);

    return tickets.map((t) =>
      this.mapDisputeTicket(t, orderByEnrollment.get(t.enrollmentId ?? '') ?? null),
    );
  }

  async getDisputeById(id: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: this.disputeTicketInclude(),
    });
    if (!ticket) throw new NotFoundException('Ticket not found');

    const order = ticket.enrollmentId
      ? await this.prisma.order.findFirst({
          where: { enrollmentId: ticket.enrollmentId },
          select: { id: true, orderCode: true, status: true, amount: true },
        })
      : null;

    return this.mapDisputeTicket(ticket, order);
  }

  private disputeTicketInclude() {
    return {
      user: { select: { id: true, name: true, role: true } },
      enrollment: {
        select: {
          id: true,
          enrollmentCode: true,
          adminGranted: true,
          student: { select: { user: { select: { name: true } } } },
          package: { select: { title: true } },
          examSession: { select: { sessionCode: true } },
        },
      },
    } satisfies Prisma.SupportTicketInclude;
  }

  private async ordersByEnrollmentIds(enrollmentIds: string[]) {
    if (enrollmentIds.length === 0) return new Map<string, { id: string; orderCode: string; status: string; amount: number }>();
    const orders = await this.prisma.order.findMany({
      where: { enrollmentId: { in: enrollmentIds } },
      select: { id: true, orderCode: true, status: true, amount: true, enrollmentId: true },
    });
    return new Map(
      orders
        .filter((o) => o.enrollmentId)
        .map((o) => [o.enrollmentId!, o]),
    );
  }

  private parseTicketMessage(description: string): string {
    if (description.startsWith('Related:')) {
      const parts = description.split('\n\n');
      if (parts.length > 1) return parts.slice(1).join('\n\n').trim();
    }
    return description.trim();
  }

  private mapDisputeTicket(
    t: {
      id: string;
      ticketCode: string;
      type: string;
      priority: string;
      status: string;
      subject: string;
      description: string;
      slaState: string;
      slaProgress: number;
      enrollmentId: string | null;
      createdAt: Date;
      user: { id: string; name: string; role: string } | null;
      enrollment: {
        id: string;
        enrollmentCode: string;
        adminGranted: boolean;
        student: { user: { name: string } };
        package: { title: string };
        examSession: { sessionCode: string } | null;
      } | null;
    },
    order: { id: string; orderCode: string; status: string; amount: number } | null,
  ) {
    const relatedFromDescription = t.description.startsWith('Related:')
      ? t.description.split('\n')[0]?.replace(/^Related:\s*/i, '').trim()
      : null;
    const enrollmentStudent = t.enrollment?.student?.user?.name ?? null;
    const enrollmentRef = t.enrollment?.enrollmentCode ?? null;
    const sessionCode = t.enrollment?.examSession?.sessionCode ?? null;

    return {
      id: t.id,
      ticketId: t.ticketCode,
      type: t.type.toLowerCase(),
      priority: t.priority.toLowerCase(),
      status: t.status.toLowerCase(),
      subject: t.subject,
      description: t.description,
      message: this.parseTicketMessage(t.description),
      preview: t.subject,
      sla: {
        state: t.slaState.toLowerCase(),
        progress: t.slaProgress,
      },
      reporter: t.user
        ? {
            id: t.user.id,
            name: t.user.name,
            role: t.user.role.toLowerCase(),
          }
        : null,
      relatedStudent: enrollmentStudent,
      relatedRef:
        relatedFromDescription ||
        (enrollmentRef
          ? `${enrollmentRef}${t.enrollment?.package?.title ? ` · ${t.enrollment.package.title}` : ''}`
          : null),
      enrollmentId: t.enrollmentId ?? t.enrollment?.id ?? null,
      enrollmentRef,
      enrollmentAdminGranted: t.enrollment?.adminGranted ?? false,
      sessionCode,
      orderId: order?.id ?? null,
      orderCode: order?.orderCode ?? null,
      orderStatus: order?.status?.toLowerCase() ?? null,
      orderAmount: order?.amount ?? null,
      createdAt: t.createdAt,
    };
  }

  async getReports(timeframeInput?: string) {
    const syncedAt = new Date();
    const timeframe = normalizeReportTimeframe(timeframeInput);
    const period = resolveReportPeriod(timeframe, syncedAt);
    const prevPeriod = previousReportPeriod(period.start, period.end);

    const paidOrderFilter = {
      status: 'PAID' as const,
      paymentMethod: { not: 'COMPLIMENTARY' as const },
    };

    const [
      periodOrders,
      prevPeriodOrders,
      funnelEnrollments,
      resultEnrollments,
      prevResultEnrollments,
      reviews,
      prevReviews,
      periodGrades,
      prevPeriodGrades,
      periodPayouts,
      prevPeriodPayouts,
      teachers,
    ] = await Promise.all([
      this.prisma.order.findMany({
        where: {
          ...paidOrderFilter,
          createdAt: { gte: period.start, lt: period.end },
        },
        select: { amount: true, createdAt: true },
      }),
      this.prisma.order.findMany({
        where: {
          ...paidOrderFilter,
          createdAt: { gte: prevPeriod.start, lt: prevPeriod.end },
        },
        select: { amount: true },
      }),
      this.prisma.enrollment.findMany({
        where: {
          OR: [
            { createdAt: { gte: period.start, lt: period.end } },
            {
              status: EnrollmentStatus.COMPLETED,
              updatedAt: { gte: period.start, lt: period.end },
            },
          ],
        },
        select: { createdAt: true, updatedAt: true, status: true },
      }),
      this.prisma.enrollment.findMany({
        where: {
          resultsStatus: ResultsStatus.RELEASED,
          updatedAt: { gte: period.start, lt: period.end },
        },
        include: REPORT_ENROLLMENT_INCLUDE,
      }),
      this.prisma.enrollment.findMany({
        where: {
          resultsStatus: ResultsStatus.RELEASED,
          updatedAt: { gte: prevPeriod.start, lt: prevPeriod.end },
        },
        include: REPORT_ENROLLMENT_INCLUDE,
      }),
      this.prisma.review.findMany({
        where: { createdAt: { gte: period.start, lt: period.end } },
        select: { rating: true },
      }),
      this.prisma.review.findMany({
        where: { createdAt: { gte: prevPeriod.start, lt: prevPeriod.end } },
        select: { rating: true },
      }),
      this.prisma.grade.findMany({
        where: { gradedAt: { gte: period.start, lt: period.end } },
        select: { gradedById: true },
      }),
      this.prisma.grade.findMany({
        where: { gradedAt: { gte: prevPeriod.start, lt: prevPeriod.end } },
        select: { gradedById: true },
      }),
      this.prisma.payout.findMany({
        where: {
          status: 'PAID',
          paidAt: { gte: period.start, lt: period.end },
        },
        select: { teacherId: true, amount: true },
      }),
      this.prisma.payout.findMany({
        where: {
          status: 'PAID',
          paidAt: { gte: prevPeriod.start, lt: prevPeriod.end },
        },
        select: { teacherId: true, amount: true },
      }),
      this.prisma.teacherProfile.findMany({
        where: { status: { not: 'SUSPENDED' } },
        include: { user: true },
      }),
    ]);

    const monthlyRevenue = this.buildMonthlyRevenueForRange(
      periodOrders,
      period.start,
      period.end,
    );
    const periodRevenueTotal = periodOrders.reduce((sum, o) => sum + o.amount, 0);
    const prevPeriodRevenueTotal = prevPeriodOrders.reduce((sum, o) => sum + o.amount, 0);

    const examsDelivered = funnelEnrollments.filter(
      (e) =>
        e.status === EnrollmentStatus.COMPLETED &&
        e.updatedAt >= period.start &&
        e.updatedAt < period.end,
    ).length;
    const prevExamsDelivered = await this.prisma.enrollment.count({
      where: {
        status: EnrollmentStatus.COMPLETED,
        updatedAt: { gte: prevPeriod.start, lt: prevPeriod.end },
      },
    });

    const overallBands: number[] = [];
    const distribution = new Map<number, number>();
    const moduleStats: Record<
      ExamSkill,
      { exams: number; bandSum: number; passCount: number }
    > = {
      [ExamSkill.LISTENING]: { exams: 0, bandSum: 0, passCount: 0 },
      [ExamSkill.READING]: { exams: 0, bandSum: 0, passCount: 0 },
      [ExamSkill.WRITING]: { exams: 0, bandSum: 0, passCount: 0 },
      [ExamSkill.SPEAKING]: { exams: 0, bandSum: 0, passCount: 0 },
    };

    for (const enrollment of resultEnrollments) {
      const overall = reportEnrollmentOverallBand(enrollment);
      if (overall != null) {
        overallBands.push(overall);
        const bucket = Math.round(overall * 2) / 2;
        distribution.set(bucket, (distribution.get(bucket) ?? 0) + 1);
      }

      for (const attempt of enrollment.examSession?.sectionAttempts ?? []) {
        if (!attempt.submittedAt) continue;
        if (attempt.submittedAt < period.start || attempt.submittedAt >= period.end) {
          continue;
        }
        const band = reportAttemptBand(attempt);
        if (band == null) continue;
        const stats = moduleStats[attempt.skill];
        stats.exams += 1;
        stats.bandSum += band;
        if (band >= PASS_BAND_THRESHOLD) stats.passCount += 1;
      }
    }

    const prevOverallBands = prevResultEnrollments
      .map((enrollment) => reportEnrollmentOverallBand(enrollment))
      .filter((band): band is number => band != null);

    const prevModuleStats: Record<ExamSkill, { exams: number; bandSum: number; passCount: number }> =
      {
        [ExamSkill.LISTENING]: { exams: 0, bandSum: 0, passCount: 0 },
        [ExamSkill.READING]: { exams: 0, bandSum: 0, passCount: 0 },
        [ExamSkill.WRITING]: { exams: 0, bandSum: 0, passCount: 0 },
        [ExamSkill.SPEAKING]: { exams: 0, bandSum: 0, passCount: 0 },
      };

    for (const enrollment of prevResultEnrollments) {
      for (const attempt of enrollment.examSession?.sectionAttempts ?? []) {
        if (!attempt.submittedAt) continue;
        if (attempt.submittedAt < prevPeriod.start || attempt.submittedAt >= prevPeriod.end) {
          continue;
        }
        const band = reportAttemptBand(attempt);
        if (band == null) continue;
        const stats = prevModuleStats[attempt.skill];
        stats.exams += 1;
        stats.bandSum += band;
        if (band >= PASS_BAND_THRESHOLD) stats.passCount += 1;
      }
    }

    const avgOverall =
      overallBands.length > 0
        ? Math.round(
            (overallBands.reduce((a, b) => a + b, 0) / overallBands.length) * 10,
          ) / 10
        : null;
    const prevAvgOverall =
      prevOverallBands.length > 0
        ? prevOverallBands.reduce((a, b) => a + b, 0) / prevOverallBands.length
        : null;

    const satisfactionPct =
      reviews.length > 0
        ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length / 5) * 100)
        : null;
    const prevSatisfactionPct =
      prevReviews.length > 0
        ? Math.round(
            (prevReviews.reduce((s, r) => s + r.rating, 0) / prevReviews.length / 5) * 100,
          )
        : null;

    const bandDistribution = REPORT_BAND_BUCKETS.map((band) => ({
      band,
      count: distribution.get(band) ?? 0,
    }));
    const peakBandCount = Math.max(...bandDistribution.map((row) => row.count), 0);

    const modulePerformance = DASHBOARD_SKILLS.map(({ skill, label }) => {
      const stats = moduleStats[skill];
      const prevStats = prevModuleStats[skill];
      const avgBand = stats.exams > 0 ? Math.round((stats.bandSum / stats.exams) * 10) / 10 : 0;
      const passRate =
        stats.exams > 0 ? Math.round((stats.passCount / stats.exams) * 100) : 0;
      const prevPassRate =
        prevStats.exams > 0
          ? Math.round((prevStats.passCount / prevStats.exams) * 100)
          : 0;
      const mom = passRate - prevPassRate;
      return {
        module: skill.toLowerCase(),
        label,
        exams: stats.exams,
        avgBand,
        passRate,
        mom,
      };
    });

    const sessionsByTeacher = new Map<string, number>();
    for (const grade of periodGrades) {
      sessionsByTeacher.set(
        grade.gradedById,
        (sessionsByTeacher.get(grade.gradedById) ?? 0) + 1,
      );
    }
    const prevSessionsByTeacher = new Map<string, number>();
    for (const grade of prevPeriodGrades) {
      prevSessionsByTeacher.set(
        grade.gradedById,
        (prevSessionsByTeacher.get(grade.gradedById) ?? 0) + 1,
      );
    }
    const earnedByTeacher = new Map<string, number>();
    for (const payout of periodPayouts) {
      earnedByTeacher.set(
        payout.teacherId,
        (earnedByTeacher.get(payout.teacherId) ?? 0) + payout.amount,
      );
    }

    const teacherLeaderboard = teachers
      .map((teacher) => {
        const sessions = sessionsByTeacher.get(teacher.id) ?? 0;
        const prevSessions = prevSessionsByTeacher.get(teacher.id) ?? 0;
        const earned = earnedByTeacher.get(teacher.id) ?? 0;
        const mom =
          prevSessions > 0
            ? Math.round(((sessions - prevSessions) / prevSessions) * 100)
            : sessions > 0
              ? 100
              : 0;
        return {
          id: teacher.id,
          name: teacher.user.name,
          status: teacher.status.toLowerCase(),
          speciality: teacher.speciality.toLowerCase(),
          sessions,
          rating: teacher.rating,
          earned,
          mom,
        };
      })
      .filter((row) => row.sessions > 0 || row.earned > 0)
      .sort((a, b) => b.sessions - a.sessions || b.earned - a.earned)
      .slice(0, 5);

    const enrollmentFunnel = this.buildEnrollmentFunnelForRange(
      funnelEnrollments,
      period.start,
      period.end,
    );

    return {
      timeframe,
      period: {
        label: period.label,
        revenueLabel: period.revenueLabel,
        examsPeriod: period.examsPeriod,
      },
      summary: {
        revenueTotal: Math.round(periodRevenueTotal * 100) / 100,
        revenueTrend: pctChangeLabel(periodRevenueTotal, prevPeriodRevenueTotal),
        revenueTrendSub: 'vs previous period',
        examsDelivered,
        examsTrend: pctChangeLabel(examsDelivered, prevExamsDelivered),
        avgBandScore: avgOverall,
        avgBandTrend:
          avgOverall != null && prevAvgOverall != null
            ? pctChangeLabel(avgOverall, prevAvgOverall)
            : '—',
        satisfaction: satisfactionPct,
        satisfactionSub:
          reviews.length > 0 ? `${reviews.length} reviews in period` : 'No reviews in period',
        satisfactionTrend:
          satisfactionPct != null && prevSatisfactionPct != null
            ? pctChangeLabel(satisfactionPct, prevSatisfactionPct)
            : '—',
      },
      monthlyRevenue: monthlyRevenue.map(({ month, amount }) => {
        const funnelMonth = enrollmentFunnel.find((row) => row.month === month);
        return {
          month,
          revenue: amount,
          exams: funnelMonth?.completed ?? 0,
        };
      }),
      enrollmentFunnel,
      bandDistribution: bandDistribution.map((row) => ({
        score: row.band.toFixed(1),
        count: row.count,
        highlight: row.count > 0 && row.count === peakBandCount,
      })),
      modulePerformance,
      teacherLeaderboard,
    };
  }

  // ─── Packages & Pricing ──────────────────────────────────────────────────

  async getPackages() {
    const [packages, tests, allAssignments] = await Promise.all([
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
      findContentTestPackageAssignments(this.prisma),
    ]);

    const assignmentsByTestId = groupAssignmentsByTestId(allAssignments);

    return {
      packages: packages.map((pkg) => ({
        id: pkg.id,
        slug: pkg.slug,
        title: pkg.title,
        description: pkg.description,
        price: pkg.price,
        currency: pkg.currency,
        examType: pkg.examType,
        packageKind: pkg.packageKind,
        mockNumber: pkg.mockNumber,
        mockLabel: formatMockNumber(pkg.packageKind, pkg.mockNumber),
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
      contentTests: tests.map((t) => {
        const summary = summarizeAssignmentsForTest(
          assignmentsByTestId.get(t.id) ?? [],
        );
        return {
          id: t.id,
          code: t.code,
          title: t.title,
          type: t.type,
          status: t.status,
          assignedPackageId: summary.assignedPackageId,
          assignedPackageTitle: summary.assignedPackageTitle,
          assignedMockLabel: summary.assignedMockLabel,
          assignedMockLabels: summary.assignedMockLabels,
          isPackaged: summary.isPackaged,
        };
      }),
    };
  }

  async getNextMockNumber(skills: unknown, examType: ExamType = 'ACADEMIC') {
    const packageKind = derivePackageKind(skills);
    const latest = await this.prisma.mockTestPackage.findFirst({
      where: { packageKind },
      orderBy: { mockNumber: 'desc' },
      select: { mockNumber: true },
    });
    const mockNumber = (latest?.mockNumber ?? 0) + 1;
    const template = getPackageContentTemplate(packageKind, examType);
    return {
      packageKind,
      packageKindLabel: packageKindLabel(packageKind),
      mockNumber,
      mockLabel: formatMockNumber(packageKind, mockNumber),
      suggestedTitle: suggestPackageTitle(examType, packageKind, mockNumber),
      description: template.description,
      included: template.included,
      rules: template.rules,
      suggestedPrice: template.suggestedPrice,
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
    const skills = (dto.skills ?? DEFAULT_PACKAGE_SKILLS) as Prisma.InputJsonValue;
    const packageKind = derivePackageKind(skills);
    const { mockNumber } = await this.getNextMockNumber(skills);

    const contentPool =
      dto.contentPool && dto.contentPool.length > 0
        ? dto.contentPool
        : this.buildContentPoolFromLinks(skills, dto);

    const hasContentLinks = contentPool.some((entry) => entry.testIds.length > 0);
    const activating = dto.isActive ?? true;

    if (hasContentLinks || activating) {
      await this.assertPackageContentLinks(skills, contentPool, null);
    }

    const slug = await this.resolveSlug(dto.title, dto.slug);

    const created = await this.prisma.mockTestPackage.create({
      data: {
        slug,
        title: dto.title,
        description: dto.description ?? null,
        price: dto.price,
        currency: dto.currency ?? CATALOG_CURRENCY,
        examType: dto.examType ?? 'ACADEMIC',
        packageKind,
        mockNumber,
        mostPopular: dto.mostPopular ?? false,
        rating: null,
        reviewCount: 0,
        skills,
        included: (dto.included ?? []) as Prisma.InputJsonValue,
        rules: (dto.rules ?? []) as Prisma.InputJsonValue,
        listeningTestId: dto.listeningTestId || null,
        readingTestId: dto.readingTestId || null,
        writingTestId: dto.writingTestId || null,
        speakingBankId: dto.speakingBankId || null,
        isActive: dto.isActive ?? true,
      },
    });

    if (hasContentLinks) {
      await this.syncContentPool(created.id, contentPool);
    }

    await this.audit.log({
      userId: actorId,
      action: AuditAction.ADMIN_PACKAGE_CREATE,
      entity: 'mock_test_package',
      entityId: created.id,
      metadata: {
        slug: created.slug,
        title: created.title,
        mockLabel: formatMockNumber(packageKind, mockNumber),
      },
    });

    if (created.mostPopular) {
      await this.ensureExclusiveMostPopular(created.id);
    }

    return created;
  }

  private mapPackageSnapshot(
    pkg: Prisma.MockTestPackageGetPayload<object>,
  ) {
    return {
      id: pkg.id,
      slug: pkg.slug,
      title: pkg.title,
      description: pkg.description,
      price: pkg.price,
      currency: pkg.currency,
      examType: pkg.examType,
      packageKind: pkg.packageKind,
      mockNumber: pkg.mockNumber,
      mockLabel: formatMockNumber(pkg.packageKind, pkg.mockNumber),
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
      enrollmentCount: 0,
      orderCount: 0,
      updatedAt: pkg.updatedAt,
    };
  }

  async clonePackage(id: string, actorId: string) {
    const source = await this.prisma.mockTestPackage.findUnique({
      where: { id },
    });
    if (!source) throw new NotFoundException('Package not found');

    const skills = (source.skills as string[]) ?? DEFAULT_PACKAGE_SKILLS;
    const { suggestedTitle } = await this.getNextMockNumber(
      skills,
      source.examType,
    );
    const slug = await this.resolveSlug(suggestedTitle);

    const cloned = await this.createPackage(
      {
        title: suggestedTitle,
        slug,
        description: source.description ?? undefined,
        price: source.price,
        currency: source.currency,
        examType: source.examType,
        mostPopular: false,
        rating: source.rating ?? undefined,
        reviewCount: source.reviewCount,
        skills: (source.skills as string[]) ?? DEFAULT_PACKAGE_SKILLS,
        included: (source.included as string[]) ?? [],
        rules: (source.rules as string[]) ?? [],
        listeningTestId: source.listeningTestId ?? undefined,
        readingTestId: source.readingTestId ?? undefined,
        writingTestId: source.writingTestId ?? undefined,
        speakingBankId: source.speakingBankId ?? undefined,
        isActive: false,
      },
      actorId,
    );

    return { package: this.mapPackageSnapshot(cloned) };
  }

  /**
   * Archive the current package (releasing exclusive L/R/W tests when safe),
   * then create an inactive successor with the same content links so admins can
   * adjust metadata or swap tests before activating for a new cohort.
   */
  async replacePackage(id: string, actorId: string) {
    const source = await this.prisma.mockTestPackage.findUnique({
      where: { id },
      include: { _count: { select: { enrollments: true, orders: true } } },
    });
    if (!source) throw new NotFoundException('Package not found');

    const activeEnrollments = await this.countActivePackageEnrollments(id);
    if (activeEnrollmentsBlockContentRelease(activeEnrollments)) {
      throw new BadRequestException(
        'Cannot replace this mock while students have active bookings or exams in progress. Wait until they finish or cancel those enrollments.',
      );
    }

    const successorTitle = source.title.replace(/\s+—\s+new$/i, '').trim();
    const title = `${successorTitle} — new`;
    const slug = await this.resolveSlug(title);
    const skills = (source.skills as string[]) ?? DEFAULT_PACKAGE_SKILLS;

    const createDto = {
      title,
      slug,
      description: source.description ?? undefined,
      price: source.price,
      currency: source.currency,
      examType: source.examType,
      mostPopular: false,
      rating: source.rating ?? undefined,
      reviewCount: source.reviewCount,
      skills,
      included: (source.included as string[]) ?? [],
      rules: (source.rules as string[]) ?? [],
      listeningTestId: source.listeningTestId ?? undefined,
      readingTestId: source.readingTestId ?? undefined,
      writingTestId: source.writingTestId ?? undefined,
      speakingBankId: source.speakingBankId ?? undefined,
      isActive: false,
    };

    if (source._count.enrollments === 0 && source._count.orders === 0) {
      await this.prisma.mockTestPackage.delete({ where: { id } });
      await this.audit.log({
        userId: actorId,
        action: AuditAction.ADMIN_PACKAGE_DELETE,
        entity: 'mock_test_package',
        entityId: id,
        metadata: { deleted: true, replaced: true },
      });
    } else {
      await this.archivePackage(id, actorId, { releaseExclusiveContent: true });
    }

    const replacement = await this.createPackage(createDto, actorId);

    await this.audit.log({
      userId: actorId,
      action: AuditAction.ADMIN_PACKAGE_UPDATE,
      entity: 'mock_test_package',
      entityId: replacement.id,
      metadata: {
        replacedFrom: id,
        mockLabel: formatMockNumber(replacement.packageKind, replacement.mockNumber),
      },
    });

    return {
      archivedId: id,
      replacement: this.mapPackageSnapshot(replacement),
    };
  }

  /**
   * Wipe all enrollments, orders, and exam sessions for a package so a failed
   * pilot can be rerun on the same mock. Blocks while a student exam is IN_PROGRESS.
   */
  async resetPackagePilot(id: string, actorId: string) {
    const pkg = await this.prisma.mockTestPackage.findUnique({
      where: { id },
      include: { _count: { select: { enrollments: true, orders: true } } },
    });
    if (!pkg) throw new NotFoundException('Package not found');

    const inProgress = await this.prisma.enrollment.count({
      where: { packageId: id, status: EnrollmentStatus.IN_PROGRESS },
    });
    if (inProgress > 0) {
      throw new BadRequestException(
        'Cannot reset pilot while a student exam is in progress. Force-submit or suspend the live session first (Admin → Live monitor).',
      );
    }

    const purged = await purgeEnrollments(this.prisma, { packageId: id });

    const orphanOrders = await this.prisma.order.findMany({
      where: { packageId: id },
      select: { id: true },
    });
    let orphanOrdersDeleted = 0;
    if (orphanOrders.length > 0) {
      const orderIds = orphanOrders.map((o) => o.id);
      await this.prisma.refund.deleteMany({ where: { orderId: { in: orderIds } } });
      await this.prisma.order.deleteMany({ where: { id: { in: orderIds } } });
      orphanOrdersDeleted = orderIds.length;
    }

    await this.audit.log({
      userId: actorId,
      action: AuditAction.ADMIN_PACKAGE_PILOT_RESET,
      entity: 'mock_test_package',
      entityId: id,
      metadata: {
        clearedEnrollments: purged.enrollments,
        clearedOrders: purged.orders + orphanOrdersDeleted,
        clearedSessions: purged.sessions,
        mockLabel: formatMockNumber(pkg.packageKind, pkg.mockNumber),
      },
    });

    return {
      clearedEnrollments: purged.enrollments,
      clearedOrders: purged.orders + orphanOrdersDeleted,
      clearedSessions: purged.sessions,
    };
  }

  async updatePackage(id: string, dto: UpdatePackageDto, actorId: string) {
    const existing = await this.prisma.mockTestPackage.findUnique({
      where: { id },
      include: { _count: { select: { enrollments: true } } },
    });
    if (!existing) throw new NotFoundException('Package not found');

    const skills = dto.skills ?? existing.skills;
    // Only treat content as "changed" when a value actually differs from what
    // is stored. The editor UI always sends every test id on save, so a
    // presence-based check (`!== undefined`) would wrongly block metadata-only
    // edits (price, title, active…) on packages that already have enrollments.
    const linkChanged = (
      next: string | null | undefined,
      current: string | null,
    ) => next !== undefined && (next ?? null) !== (current ?? null);

    const contentLinksChanged =
      linkChanged(dto.listeningTestId, existing.listeningTestId) ||
      linkChanged(dto.readingTestId, existing.readingTestId) ||
      linkChanged(dto.writingTestId, existing.writingTestId) ||
      linkChanged(dto.speakingBankId, existing.speakingBankId) ||
      dto.contentPool !== undefined;

    if (existing._count.enrollments > 0 && contentLinksChanged) {
      throw new BadRequestException(
        'Cannot change linked tests after students have enrolled. Archive this package and create a new mock instead.',
      );
    }

    const mergedLinks = {
      listeningTestId:
        dto.listeningTestId !== undefined
          ? dto.listeningTestId
          : existing.listeningTestId,
      readingTestId:
        dto.readingTestId !== undefined ? dto.readingTestId : existing.readingTestId,
      writingTestId:
        dto.writingTestId !== undefined ? dto.writingTestId : existing.writingTestId,
      speakingBankId:
        dto.speakingBankId !== undefined
          ? dto.speakingBankId
          : existing.speakingBankId,
    };

    const contentPool =
      dto.contentPool !== undefined
        ? dto.contentPool
        : contentLinksChanged
          ? this.buildContentPoolFromLinks(skills, mergedLinks)
          : null;

    if (contentPool) {
      await this.assertPackageContentLinks(skills, contentPool, id);
    }

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
    // rating and reviewCount are computed from student reviews only.
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

    if (contentPool) {
      await this.syncContentPool(id, contentPool);
    }

    await this.audit.log({
      userId: actorId,
      action: AuditAction.ADMIN_PACKAGE_UPDATE,
      entity: 'mock_test_package',
      entityId: id,
      metadata: { fields: Object.keys(dto) },
    });

    if (dto.mostPopular === true) {
      await this.ensureExclusiveMostPopular(id);
    }

    return updated;
  }

  private async ensureExclusiveMostPopular(packageId: string) {
    await this.prisma.mockTestPackage.updateMany({
      where: { id: { not: packageId }, mostPopular: true },
      data: { mostPopular: false },
    });
  }

  private static readonly POOL_SKILL_TYPE: Record<
    'listening' | 'reading' | 'writing' | 'speaking',
    'LISTENING' | 'READING' | 'WRITING' | 'SPEAKING'
  > = {
    listening: 'LISTENING',
    reading: 'READING',
    writing: 'WRITING',
    speaking: 'SPEAKING',
  };

  /** Replaces a package's content bindings — exactly one published test per skill. */
  private async syncContentPool(
    packageId: string,
    pool: { skill: 'listening' | 'reading' | 'writing' | 'speaking'; testIds: string[] }[],
  ) {
    const rows = pool.flatMap((entry) =>
      entry.testIds.map((testId) => ({
        packageId,
        testId,
        skill: AdminService.POOL_SKILL_TYPE[entry.skill] as ExamSkill,
      })),
    );

    const fkUpdates: Prisma.MockTestPackageUpdateInput = {
      listeningTest: { disconnect: true },
      readingTest: { disconnect: true },
      writingTest: { disconnect: true },
      speakingBank: { disconnect: true },
    };
    for (const row of rows) {
      const field = SKILL_TO_TEST_FIELD[row.skill];
      const relationKey =
        field === 'listeningTestId'
          ? 'listeningTest'
          : field === 'readingTestId'
            ? 'readingTest'
            : field === 'writingTestId'
              ? 'writingTest'
              : 'speakingBank';
      (fkUpdates as Record<string, unknown>)[relationKey] = {
        connect: { id: row.testId },
      };
    }

    await this.prisma.$transaction([
      this.prisma.packageContentTest.deleteMany({ where: { packageId } }),
      ...(rows.length > 0
        ? [this.prisma.packageContentTest.createMany({ data: rows })]
        : []),
      this.prisma.mockTestPackage.update({
        where: { id: packageId },
        data: fkUpdates,
      }),
    ]);
  }

  private buildContentPoolFromLinks(
    skills: unknown,
    links: {
      listeningTestId?: string | null;
      readingTestId?: string | null;
      writingTestId?: string | null;
      speakingBankId?: string | null;
    },
  ): { skill: 'listening' | 'reading' | 'writing' | 'speaking'; testIds: string[] }[] {
    const pool: {
      skill: 'listening' | 'reading' | 'writing' | 'speaking';
      testIds: string[];
    }[] = [];

    for (const skill of packageExamSkills(skills)) {
      const key = SKILL_TO_POOL_KEY[skill];
      const field = SKILL_TO_TEST_FIELD[skill];
      const testId = links[field as keyof typeof links];
      if (testId) {
        pool.push({ skill: key, testIds: [testId] });
      }
    }

    return pool;
  }

  private async assertPackageContentLinks(
    skills: unknown,
    pool: { skill: 'listening' | 'reading' | 'writing' | 'speaking'; testIds: string[] }[],
    excludePackageId: string | null,
  ) {
    const requiredSkills = packageExamSkills(skills);
    const poolBySkill = new Map(pool.map((entry) => [entry.skill, entry.testIds]));

    for (const skill of requiredSkills) {
      const key = SKILL_TO_POOL_KEY[skill];
      const testIds = poolBySkill.get(key) ?? [];
      if (testIds.length !== 1) {
        throw new BadRequestException(
          `Select exactly one published ${key} test for this package`,
        );
      }
    }

    for (const entry of pool) {
      if (entry.testIds.length !== 1) {
        throw new BadRequestException(
          `Only one ${entry.skill} test may be linked per package`,
        );
      }
    }

    const allIds = pool.flatMap((entry) => entry.testIds);
    if (new Set(allIds).size !== allIds.length) {
      throw new BadRequestException('The same test cannot be linked to multiple skills');
    }

    await this.assertPublishedTestIds(allIds);

    if (allIds.length === 0) return;

    const tests = await this.prisma.contentTest.findMany({
      where: { id: { in: allIds } },
      select: { id: true, code: true, type: true },
    });
    const byId = new Map(tests.map((t) => [t.id, t]));

    for (const entry of pool) {
      const expected = AdminService.POOL_SKILL_TYPE[entry.skill];
      const test = byId.get(entry.testIds[0]!);
      if (test && test.type !== expected) {
        throw new BadRequestException(
          `Test ${test.code} is not a ${entry.skill} test`,
        );
      }
    }

    // Listening/Reading/Writing papers are single-use and must stay exclusive to
    // one package. Speaking banks are reusable topic pools, so they're exempt from
    // the cross-package conflict check.
    const exclusiveIds = pool
      .filter((entry) => entry.skill !== 'speaking')
      .flatMap((entry) => entry.testIds);

    if (exclusiveIds.length > 0) {
      const existingAssignments = await this.prisma.packageContentTest.findMany({
        where: {
          testId: { in: exclusiveIds },
          ...(excludePackageId ? { packageId: { not: excludePackageId } } : {}),
        },
        include: {
          test: { select: { code: true } },
          package: { select: { mockNumber: true, packageKind: true, title: true } },
        },
      });

      if (existingAssignments.length > 0) {
        const conflict = existingAssignments[0]!;
        throw new BadRequestException(
          `Test ${conflict.test.code} is already used in ${formatMockNumber(conflict.package.packageKind, conflict.package.mockNumber)} (${conflict.package.title})`,
        );
      }
    }
  }

  private async assertPublishedTestIds(
    ids: (string | null | undefined)[],
  ) {
    const linked = ids.filter((id): id is string => Boolean(id));
    if (linked.length === 0) return;

    const tests = await this.prisma.contentTest.findMany({
      where: { id: { in: linked } },
      select: { id: true, code: true, status: true },
    });

    if (tests.length !== linked.length) {
      throw new BadRequestException('One or more linked content tests were not found');
    }

    const blocked = tests.filter((t) => t.status !== ContentTestStatus.PUBLISHED);
    if (blocked.length > 0) {
      const codes = blocked.map((t) => t.code).join(', ');
      const hasArchived = blocked.some(
        (t) => t.status === ContentTestStatus.ARCHIVED,
      );
      throw new BadRequestException(
        hasArchived
          ? `Retired tests cannot be linked to packages (${codes}). Assign a published replacement.`
          : `Only published tests can be linked to packages (${codes})`,
      );
    }
  }

  async deletePackage(id: string, actorId: string) {
    const pkg = await this.prisma.mockTestPackage.findUnique({
      where: { id },
      include: { _count: { select: { enrollments: true, orders: true } } },
    });
    if (!pkg) throw new NotFoundException('Package not found');

    // Preserve referential history: archive packages that have activity.
    if (pkg._count.enrollments > 0 || pkg._count.orders > 0) {
      const releasedContent = await this.tryReleaseExclusivePackageContent(id);
      await this.archivePackage(id, actorId, { alreadyReleased: releasedContent });
      return { archived: true, releasedContent };
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

  private async countActivePackageEnrollments(packageId: string): Promise<number> {
    return this.prisma.enrollment.count({
      where: {
        packageId,
        status: { in: [...ACTIVE_PACKAGE_ENROLLMENT_STATUSES] },
      },
    });
  }

  /** Clears exclusive L/R/W bindings so papers can be linked to another package. */
  private async releaseExclusivePackageContent(packageId: string) {
    await this.prisma.$transaction([
      this.prisma.packageContentTest.deleteMany({
        where: {
          packageId,
          skill: { in: [...EXCLUSIVE_PACKAGE_SKILLS] },
        },
      }),
      this.prisma.mockTestPackage.update({
        where: { id: packageId },
        data: {
          listeningTestId: null,
          readingTestId: null,
          writingTestId: null,
        },
      }),
    ]);
  }

  /**
   * Release exclusive papers when no students are mid-booking or mid-exam.
   * Returns whether content was released.
   */
  private async tryReleaseExclusivePackageContent(
    packageId: string,
  ): Promise<boolean> {
    const active = await this.countActivePackageEnrollments(packageId);
    if (activeEnrollmentsBlockContentRelease(active)) return false;
    await this.releaseExclusivePackageContent(packageId);
    return true;
  }

  private async archivePackage(
    id: string,
    actorId: string,
    options?: { releaseExclusiveContent?: boolean; alreadyReleased?: boolean },
  ) {
    if (options?.releaseExclusiveContent) {
      const active = await this.countActivePackageEnrollments(id);
      if (activeEnrollmentsBlockContentRelease(active)) {
        throw new BadRequestException(
          'Cannot release exam content while students have active bookings or exams in progress.',
        );
      }
      if (!options.alreadyReleased) {
        await this.releaseExclusivePackageContent(id);
      }
    }

    await this.prisma.mockTestPackage.update({
      where: { id },
      data: { isActive: false },
    });

    await this.audit.log({
      userId: actorId,
      action: AuditAction.ADMIN_PACKAGE_DELETE,
      entity: 'mock_test_package',
      entityId: id,
      metadata: {
        archived: true,
        releasedContent: Boolean(
          options?.releaseExclusiveContent || options?.alreadyReleased,
        ),
      },
    });
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
    const resolving =
      dto.status === 'RESOLVED' || dto.status === 'CLOSED';
    if (dto.status !== undefined) {
      data.status = dto.status;
      if (resolving) {
        data.resolvedAt = new Date();
        data.slaState = 'ON_TRACK';
        data.slaProgress = 100;
      }
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No changes supplied');
    }

    const updated = await this.prisma.supportTicket.update({ where: { id }, data });

    if (resolving && ticket.userId) {
      const reporter = await this.prisma.user.findUnique({
        where: { id: ticket.userId },
        select: {
          role: true,
          studentProfile: { select: { institutionId: true } },
          teacherProfile: { select: { institutionId: true } },
        },
      });
      const centreMember =
        reporter?.studentProfile?.institutionId != null ||
        reporter?.teacherProfile?.institutionId != null;
      const helpPath = reporter
        ? helpPathForReporter(reporter.role, centreMember)
        : '/student/help';
      await this.notifications.create(
        ticket.userId,
        'Support ticket resolved',
        `${ticket.ticketCode} (“${ticket.subject}”) has been resolved by the support team.`,
        NotificationType.INFO,
        helpPath,
      );
    }

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

  /** Reassign the writing grader for an enrollment (no-show / unavailable ops). */
  async reassignWritingTeacher(
    enrollmentId: string,
    teacherId: string,
    actorId: string,
  ) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        examSession: {
          include: { sectionAttempts: { include: { writingSubmission: true } } },
        },
      },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');

    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { id: teacherId },
      include: { user: true },
    });
    if (!teacher) throw new NotFoundException('Teacher not found');
    if (teacher.status !== 'APPROVED') {
      throw new BadRequestException('Teacher must be approved to be assigned');
    }

    const writingAttempt = enrollment.examSession?.sectionAttempts.find(
      (a) => a.skill === ExamSkill.WRITING,
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.enrollment.update({
        where: { id: enrollmentId },
        data: { writingTeacherId: teacherId },
      });
      if (writingAttempt?.writingSubmission) {
        await tx.writingSubmission.update({
          where: { id: writingAttempt.writingSubmission.id },
          data: {
            teacherId,
            slaDueAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
          },
        });
      }
    });

    await this.notifications.create(
      teacher.userId,
      'Writing submission assigned',
      'You have been assigned a writing submission to grade.',
      NotificationType.GRADING,
      '/teacher/writing',
    );

    await this.audit.log({
      userId: actorId,
      action: AuditAction.ADMIN_TEACHER_REASSIGN,
      entity: 'enrollment',
      entityId: enrollmentId,
      metadata: { skill: 'writing', teacherId },
    });

    return { reassigned: true };
  }

  /**
   * Reopens a graded Writing/Speaking section for re-grading (dispute outcome):
   * deletes the existing grade, resets the section status, pulls results back to
   * PENDING, and re-notifies the assigned teacher.
   */
  async reopenForRegrade(
    enrollmentId: string,
    skill: 'writing' | 'speaking',
    actorId: string,
    reason?: string,
  ) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        examSession: {
          include: {
            sectionAttempts: {
              include: {
                writingSubmission: { include: { grade: true, teacher: true } },
                speakingSession: { include: { grade: true, teacher: true } },
              },
            },
          },
        },
      },
    });
    if (!enrollment?.examSession) throw new NotFoundException('Enrollment not found');

    const targetSkill =
      skill === 'writing' ? ExamSkill.WRITING : ExamSkill.SPEAKING;
    const attempt = enrollment.examSession.sectionAttempts.find(
      (a) => a.skill === targetSkill,
    );
    if (!attempt) throw new BadRequestException(`No ${skill} section to regrade`);

    let teacherUserId: string | null = null;

    await this.prisma.$transaction(async (tx) => {
      if (skill === 'writing' && attempt.writingSubmission) {
        teacherUserId = attempt.writingSubmission.teacher?.userId ?? null;
        if (attempt.writingSubmission.grade) {
          await tx.grade.delete({
            where: { id: attempt.writingSubmission.grade.id },
          });
        }
        await tx.writingSubmission.update({
          where: { id: attempt.writingSubmission.id },
          data: {
            status: 'IN_REVIEW',
            slaDueAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
          },
        });
      } else if (skill === 'speaking' && attempt.speakingSession) {
        teacherUserId = attempt.speakingSession.teacher?.userId ?? null;
        if (attempt.speakingSession.grade) {
          await tx.grade.delete({
            where: { id: attempt.speakingSession.grade.id },
          });
        }
      }

      await tx.sectionAttempt.update({
        where: { id: attempt.id },
        data: { band: null },
      });

      await tx.enrollment.update({
        where: { id: enrollmentId },
        data: { resultsStatus: ResultsStatus.PENDING },
      });

      await tx.examSession.update({
        where: { id: enrollment.examSession!.id },
        data: { state: ExamSessionState.AWAITING_GRADING },
      });
    });

    if (teacherUserId) {
      await this.notifications.create(
        teacherUserId,
        'Re-grade requested',
        `A ${skill} section must be re-graded${reason ? `: ${reason}` : '.'}`,
        NotificationType.GRADING,
        skill === 'writing' ? '/teacher/writing' : '/teacher/speaking',
      );
    }

    await this.audit.log({
      userId: actorId,
      action: AuditAction.ADMIN_GRADE_REOPEN,
      entity: 'enrollment',
      entityId: enrollmentId,
      metadata: { skill, reason },
    });

    return { reopened: true };
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
    if (!order.student) {
      throw new BadRequestException(
        'Only student enrollment orders can be refunded here',
      );
    }
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
      `A refund of ${formatMoney(refundAmount, order.currency)} has been issued for order ${order.orderCode}.`,
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

    const seedEmails = new Set<string>(SEED_DEMO_TEACHER_EMAILS);
    const seedAmounts = new Set<number>(SEED_DEMO_PAYOUT_AMOUNTS);

    return payouts
      .filter((p) => {
        // Hide prisma seed demo rows until they are purged from the DB.
        const email = p.teacher.user.email.toLowerCase();
        return !(seedEmails.has(email) && seedAmounts.has(p.amount));
      })
      .map((p) => {
        const details = p.teacher.payoutDetails as {
          bankName?: string;
          accountLast4?: string;
          accountName?: string;
          method?: string;
        } | null;
        const bankLabel =
          details?.bankName && details?.accountLast4
            ? `${details.bankName} ···${details.accountLast4}`
            : null;

        return {
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
          bankLabel,
          accountName: details?.accountName ?? null,
          payoutMethod: details?.method ?? null,
        };
      });
  }

  /**
   * Removes known prisma-seed demo payouts ($325 / $210 / $890 for @example.com
   * teachers) and recalculates those teachers' totalEarned from remaining rows.
   * Safe for production: only matches the seed fingerprint.
   */
  async purgeSeedDemoPayouts(actorId: string) {
    const teachers = await this.prisma.teacherProfile.findMany({
      where: {
        user: { email: { in: [...SEED_DEMO_TEACHER_EMAILS] } },
      },
      select: { id: true, user: { select: { email: true, name: true } } },
    });

    if (teachers.length === 0) {
      return { deleted: 0, teachersUpdated: 0 };
    }

    const teacherIds = teachers.map((t) => t.id);
    const deleted = await this.prisma.$transaction(async (tx) => {
      const result = await tx.payout.deleteMany({
        where: {
          teacherId: { in: teacherIds },
          amount: { in: [...SEED_DEMO_PAYOUT_AMOUNTS] },
        },
      });

      for (const teacher of teachers) {
        const remaining = await tx.payout.aggregate({
          where: { teacherId: teacher.id },
          _sum: { amount: true },
        });
        await tx.teacherProfile.update({
          where: { id: teacher.id },
          data: { totalEarned: remaining._sum.amount ?? 0 },
        });
      }

      return result.count;
    });

    await this.audit.log({
      userId: actorId,
      action: 'PURGE_SEED_DEMO_PAYOUTS',
      entity: 'payout',
      entityId: null,
      metadata: {
        deleted,
        teachers: teachers.map((t) => t.user.email),
      },
    });

    return { deleted, teachersUpdated: teachers.length };
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
          ? `${formatMoney(payout.amount, payout.currency)} has been marked as paid for the period ending ${payout.periodEnd.toLocaleDateString()}.`
          : `Your payout of ${formatMoney(payout.amount, payout.currency)} could not be processed. Update your bank details or contact support.`;

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
