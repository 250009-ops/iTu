import { BadRequestException, Injectable } from '@nestjs/common';
import { InstitutionStatus } from '@prisma/client';
import { randomBytes } from 'crypto';
import { AuditAction } from '../../common/audit/audit.actions';
import { AuditService } from '../../common/audit/audit.service';
import { PrismaService } from '../../prisma/prisma.service';
import { teacherSpecialityWhere } from '../../common/teacher-speciality';
import { InstitutionApplicationDto } from './dto/institution-application.dto';

@Injectable()
export class MarketingService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

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

    const existing = await this.prisma.institution.findFirst({
      where: { contactEmail },
      select: { id: true },
    });
    if (existing) {
      return { status: 'received' as const };
    }

    const slug = await this.uniqueSlug(dto.organisation);
    const institution = await this.prisma.institution.create({
      data: {
        name: dto.organisation.trim(),
        slug,
        status: InstitutionStatus.PENDING,
        contactName: dto.name.trim(),
        contactEmail,
        contactPhone: dto.phone?.trim() || null,
      },
    });

    await this.audit.log({
      action: AuditAction.INSTITUTION_APPLICATION,
      entity: 'institution',
      entityId: institution.id,
      metadata: {
        source: 'marketing-site',
        contactEmail,
        expectedStudents: dto.expectedStudents ?? null,
        message: dto.message ?? null,
      },
    });

    return { status: 'received' as const };
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
    const students = await this.prisma.studentProfile.findMany({
      where: {
        publishToLeaderboard: true,
        enrollments: { some: { status: 'COMPLETED', resultsStatus: 'RELEASED' } },
      },
      include: {
        user: { select: { name: true } },
        enrollments: {
          where: { status: 'COMPLETED' },
          include: {
            examSession: { select: { sectionAttempts: true } },
          },
          orderBy: { mockDate: 'asc' },
        },
      },
    });

    const ranked = students
      .map((s) => {
        const overalls: number[] = [];
        let best: Record<string, number> = {};
        let bestOverall = 0;
        for (const e of s.enrollments) {
          const bySkill: Record<string, number> = {};
          for (const a of e.examSession?.sectionAttempts ?? []) {
            if (a.band != null) bySkill[a.skill.toLowerCase()] = a.band;
          }
          const bands = Object.values(bySkill);
          if (!bands.length) continue;
          const overall =
            Math.round((bands.reduce((a, b) => a + b, 0) / bands.length) * 2) / 2;
          overalls.push(overall);
          if (overall >= bestOverall) {
            bestOverall = overall;
            best = bySkill;
          }
        }
        if (!overalls.length) return null;
        const improvement =
          overalls.length > 1
            ? Math.round((overalls[overalls.length - 1] - overalls[0]) * 2) / 2
            : 0;
        return {
          id: s.id,
          name: s.user.name,
          country: s.country ?? '',
          overallBand: bestOverall,
          skillBands: {
            listening: best.listening ?? 0,
            reading: best.reading ?? 0,
            writing: best.writing ?? 0,
            speaking: best.speaking ?? 0,
          },
          improvementDelta: improvement,
        };
      })
      .filter((s): s is NonNullable<typeof s> => s != null)
      .sort((a, b) => b.overallBand - a.overallBand)
      .slice(0, limit)
      .map((s, i) => ({ ...s, rank: i + 1 }));

    return ranked;
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

    return teachers.map((t) => this.toPublicTeacher(t));
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
      ...this.toPublicTeacher(t),
      reviews: t.reviews.map((r) => ({
        id: r.id,
        name: r.student.user.name,
        rating: r.rating,
        quote: r.comment ?? '',
      })),
    };
  }

  private toPublicTeacher(t: {
    id: string;
    slug: string | null;
    user: { name: string };
    bio: string | null;
    longBio: string | null;
    credentials: unknown;
    languages: unknown;
    speciality: string;
    rating: number | null;
    reviewCount: number;
    isTopRated: boolean;
    totalSessions: number;
  }) {
    const specialityLabel =
      t.speciality === 'BOTH'
        ? 'Writing & Speaking'
        : t.speciality === 'WRITING'
          ? 'Writing'
          : 'Speaking';

    return {
      id: t.id,
      slug: t.slug ?? t.id,
      name: t.user.name,
      initials: initialsOf(t.user.name),
      speciality: specialityLabel,
      rating: t.rating ?? 0,
      reviewCount: t.reviewCount,
      totalSessions: t.totalSessions,
      isTopRated: t.isTopRated,
      bio: t.bio ?? '',
      longBio: t.longBio ?? t.bio ?? '',
      credentials: Array.isArray(t.credentials) ? (t.credentials as string[]) : [],
      languages: Array.isArray(t.languages) ? (t.languages as string[]) : ['English'],
    };
  }
}

function initialsOf(name: string): string {
  return name
    .replace(/^(Dr\.?|Prof\.?)\s+/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}
