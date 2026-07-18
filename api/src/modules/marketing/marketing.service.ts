import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  InstitutionStatus,
  InstitutionMemberStatus,
  UserRole,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { AuditAction } from '../../common/audit/audit.actions';
import { AuditService } from '../../common/audit/audit.service';
import { submitInstitutionApplication } from '../../common/institution/institution-applications';
import { notifyAdminsOfInstitutionApplication } from '../../common/institution/notify-admins';
import { MailService } from '../../common/mail/mail.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { toPublicTeacher } from '../../common/public-teacher';
import {
  buildStudentLeaderboard,
  sliceLeaderboard,
} from '../../common/student-leaderboard';
import { teacherSpecialityWhere } from '../../common/teacher-speciality';
import { InstitutionApplicationDto } from './dto/institution-application.dto';
import { JoinCenterDto } from './dto/join-center.dto';

const SETUP_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class MarketingService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private config: ConfigService,
    private mail: MailService,
    private notifications: NotificationsService,
  ) {}

  private appUrl(): string {
    return this.config
      .get<string>('APP_URL', 'http://localhost:3000')
      .replace(/\/$/, '');
  }

  /**
   * Public institution lead from the marketing site. Creates a PENDING
   * institution (the same record the Telegram bot produces) so it lands in the
   * admin Institutions → Applications queue. Idempotent per contact email and
   * intentionally non-leaky: always reports success.
   */
  async createInstitutionApplication(dto: InstitutionApplicationDto) {
    const contactEmail = dto.email.trim().toLowerCase();

    // The owner account is created fresh on approval, so the email must be
    // unused. Reject early with a clear message the applicant can act on.
    const userClash = await this.prisma.user.findUnique({
      where: { email: contactEmail },
      select: { id: true },
    });
    if (userClash) {
      throw new BadRequestException(
        'This email is already registered on iTestU. Please sign in, or use a different email for the centre owner.',
      );
    }

    const slug = await this.uniqueSlug(dto.organisation);
    const result = await submitInstitutionApplication(this.prisma, {
      name: dto.organisation.trim(),
      slug,
      contactName: dto.name.trim(),
      contactEmail,
      contactPhone: dto.phone?.trim() || null,
    });

    if (
      result.kind === 'duplicate_pending' ||
      result.kind === 'duplicate_active'
    ) {
      return { status: 'received' as const };
    }

    await this.audit.log({
      action: AuditAction.INSTITUTION_APPLICATION,
      entity: 'institution',
      entityId: result.institutionId,
      metadata: {
        source: 'marketing-site',
        contactEmail,
        expectedStudents: dto.expectedStudents ?? null,
        message: dto.message ?? null,
        reopened: result.kind === 'reopened',
      },
    });

    void notifyAdminsOfInstitutionApplication(
      this.prisma,
      this.notifications,
      dto.organisation.trim(),
      contactEmail,
      'marketing-site',
    ).catch(() => undefined);

    return { status: 'received' as const };
  }

  /** Public partner-onboarding links for the marketing site. */
  getPartnerOnboarding() {
    const bot = this.botUsername();
    return {
      telegramApplyLink: bot ? `https://t.me/${bot}` : null,
    };
  }

  private async uniqueSlug(name: string): Promise<string> {
    const base =
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 40) || 'center';
    let slug = base;
    for (let i = 0; i < 5; i++) {
      const clash = await this.prisma.institution.findUnique({
        where: { slug },
      });
      if (!clash) return slug;
      slug = `${base}-${randomBytes(2).toString('hex')}`;
    }
    return `${base}-${randomBytes(4).toString('hex')}`;
  }

  async getStats() {
    const [mocksDelivered, examiners, ratingAgg, candidates, improvement] =
      await Promise.all([
        this.prisma.enrollment.count({ where: { status: 'COMPLETED' } }),
        this.prisma.teacherProfile.count({
          where: { status: 'APPROVED', institutionId: null },
        }),
        this.prisma.teacherProfile.aggregate({
          where: { status: 'APPROVED', institutionId: null, rating: { not: null } },
          _avg: { rating: true },
        }),
        this.prisma.studentProfile.count({
          where: { enrollments: { some: {} } },
        }),
        this.computeAverageImprovement(),
      ]);

    return {
      mocksDelivered,
      candidates,
      certifiedExaminers: examiners,
      examinerRating: ratingAgg._avg.rating
        ? Math.round(ratingAgg._avg.rating * 10) / 10
        : null,
      avgBandImprovement: improvement,
    };
  }

  /** Average (latest − first) released overall band across students with ≥2 completed mocks. */
  private async computeAverageImprovement(): Promise<number | null> {
    const completed = await this.prisma.enrollment.findMany({
      where: { status: 'COMPLETED' },
      select: {
        studentId: true,
        mockDate: true,
        examSession: { select: { sectionAttempts: { select: { band: true } } } },
      },
      orderBy: { mockDate: 'asc' },
    });

    const byStudent = new Map<string, number[]>();
    for (const e of completed) {
      const bands = (e.examSession?.sectionAttempts ?? [])
        .map((a) => a.band)
        .filter((b): b is number => b != null);
      if (!bands.length) continue;
      const overall =
        Math.round((bands.reduce((a, b) => a + b, 0) / bands.length) * 2) / 2;
      const arr = byStudent.get(e.studentId) ?? [];
      arr.push(overall);
      byStudent.set(e.studentId, arr);
    }

    const deltas: number[] = [];
    for (const overalls of byStudent.values()) {
      if (overalls.length < 2) continue;
      deltas.push(overalls[overalls.length - 1] - overalls[0]);
    }
    if (!deltas.length) return null;
    return Math.round((deltas.reduce((a, b) => a + b, 0) / deltas.length) * 10) / 10;
  }

  async getLeaderboard(limit = 7) {
    const rows = await buildStudentLeaderboard(this.prisma);
    return sliceLeaderboard(rows, limit);
  }

  async getTestimonials(limit = 6) {
    const reviews = await this.prisma.review.findMany({
      where: { publishConsent: true, comment: { not: null } },
      include: {
        student: { include: { user: { select: { name: true } } } },
        package: { select: { title: true } },
        enrollment: {
          select: {
            examSession: { select: { sectionAttempts: { select: { band: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return reviews.map((r) => {
      const bands = (r.enrollment.examSession?.sectionAttempts ?? [])
        .map((a) => a.band)
        .filter((b): b is number => b != null);
      const band = bands.length
        ? Math.round((bands.reduce((a, b) => a + b, 0) / bands.length) * 2) / 2
        : null;
      return {
        id: r.id,
        quote: r.comment ?? '',
        name: r.student.user.name,
        country: r.student.country ?? '',
        rating: r.rating,
        band,
      };
    });
  }

  async getTeachers(speciality?: 'writing' | 'speaking' | 'both') {
    const teachers = await this.prisma.teacherProfile.findMany({
      where: {
        status: 'APPROVED',
        institutionId: null,
        ...teacherSpecialityWhere(speciality),
      },
      include: { user: { select: { name: true } } },
      orderBy: [{ isTopRated: 'desc' }, { rating: 'desc' }],
    });

    return teachers
      .map((t) => toPublicTeacher(t))
      .filter((t) => t.bio.trim().length > 0);
  }

  async getTeacher(slug: string) {
    const t = await this.prisma.teacherProfile.findFirst({
      where: { slug, status: 'APPROVED', institutionId: null },
      include: {
        user: { select: { name: true } },
        reviews: {
          where: { publishConsent: true, comment: { not: null } },
          include: { student: { include: { user: { select: { name: true } } } } },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });
    if (!t) return null;

    return {
      ...toPublicTeacher(t),
      reviews: t.reviews.map((r) => ({
        id: r.id,
        name: r.student.user.name,
        rating: r.rating,
        quote: r.comment ?? '',
      })),
    };
  }

  // ─── Partner centres (public) ────────────────────────────────────────────

  /** Bare @username for the onboarding bot, tolerant of URL/@ formats. */
  private botUsername(): string {
    return this.config
      .get<string>('TELEGRAM_BOT_USERNAME', '')
      .trim()
      .replace(/^https?:\/\/t\.me\//i, '')
      .replace(/^t\.me\//i, '')
      .replace(/^@/, '')
      .replace(/\/+$/, '');
  }

  /** Telegram deep link a student taps to join a specific centre. */
  private joinDeepLink(institutionId: string): string | null {
    const bot = this.botUsername();
    return bot ? `https://t.me/${bot}?start=inst_${institutionId}` : null;
  }

  /** Public list of active partner centres for the marketing site. */
  async getCenters() {
    const centers = await this.prisma.institution.findMany({
      where: { status: InstitutionStatus.ACTIVE },
      select: {
        id: true,
        name: true,
        slug: true,
        city: true,
        logoUrl: true,
        bio: true,
        _count: {
          select: {
            students: {
              where: { institutionStatus: InstitutionMemberStatus.ACTIVE },
            },
          },
        },
      },
      orderBy: [{ createdAt: 'asc' }],
    });

    return centers
      .map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        city: c.city,
        logoUrl: c.logoUrl,
        bio: c.bio,
        studentCount: c._count.students,
        joinDeepLink: this.joinDeepLink(c.id),
      }))
      .sort((a, b) => b.studentCount - a.studentCount);
  }

  /** Public profile for a single active partner centre. */
  async getCenter(slug: string) {
    const c = await this.prisma.institution.findFirst({
      where: { slug, status: InstitutionStatus.ACTIVE },
      select: {
        id: true,
        name: true,
        slug: true,
        city: true,
        address: true,
        logoUrl: true,
        bio: true,
        createdAt: true,
        _count: {
          select: {
            students: {
              where: { institutionStatus: InstitutionMemberStatus.ACTIVE },
            },
            enrollments: { where: { status: 'COMPLETED' } },
            teachers: { where: { status: 'APPROVED' } },
          },
        },
      },
    });
    if (!c) return null;

    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      city: c.city,
      address: c.address,
      logoUrl: c.logoUrl,
      bio: c.bio,
      partnerSince: c.createdAt,
      studentCount: c._count.students,
      mocksDelivered: c._count.enrollments,
      examinerCount: c._count.teachers,
      joinDeepLink: this.joinDeepLink(c.id),
    };
  }

  /**
   * Web-native student sign-up for a centre — the same outcome as the Telegram
   * bot's student flow, but entirely on our own domain so it works where
   * Telegram is blocked. Creates a PENDING centre student and emails a
   * verify-and-set-password link. The centre still approves access afterwards.
   */
  async joinCenter(slug: string, dto: JoinCenterDto) {
    const institution = await this.prisma.institution.findFirst({
      where: { slug, status: InstitutionStatus.ACTIVE },
      select: { id: true, name: true },
    });
    if (!institution) {
      throw new BadRequestException(
        'This centre is not available for sign-up right now.',
      );
    }

    const email = dto.email.trim().toLowerCase();
    const name = dto.name.trim();

    const existing = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing) {
      throw new BadRequestException(
        `This email is already registered on iTestU. Please sign in at ${this.appUrl()}/login instead.`,
      );
    }

    const rawToken = randomBytes(32).toString('hex');
    const passwordResetToken = createHash('sha256')
      .update(rawToken)
      .digest('hex');
    const passwordResetExpires = new Date(Date.now() + SETUP_TOKEN_TTL_MS);
    const passwordHash = await bcrypt.hash(
      randomBytes(16).toString('hex'),
      12,
    );

    const user = await this.prisma.user.create({
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
    });

    const setupUrl = `${this.appUrl()}/reset-password?token=${rawToken}`;
    void this.mail
      .sendInstitutionStudentInviteEmail(
        email,
        name,
        institution.name,
        setupUrl,
      )
      .catch(() => undefined);

    await this.audit.log({
      userId: user.id,
      action: AuditAction.INSTITUTION_STUDENT_JOIN,
      entity: 'user',
      entityId: user.id,
      metadata: { source: 'web', institutionId: institution.id },
    });

    return { status: 'ok', centerName: institution.name, email };
  }
}
