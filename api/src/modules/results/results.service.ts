import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ExamSkill } from '@prisma/client';
import { RequestUser } from '../../common/types/request-user';
import { PrismaService } from '../../prisma/prisma.service';
import { packageExamSkills } from '../content/package-skills';
import {
  lookupBandFromRawScore,
  overallBandFromSkillBands,
  resolveAttemptBand,
} from '../../common/band-resolution';
import { ResultsPdfService } from './results-pdf.service';

@Injectable()
export class ResultsService {
  constructor(
    private prisma: PrismaService,
    private pdf: ResultsPdfService,
  ) {}

  async getByEnrollment(enrollmentId: string, user: RequestUser) {
    const enrollment = await this.findEnrollment(enrollmentId);
    this.assertAccess(enrollment, user);

    if (enrollment.resultsStatus !== 'RELEASED') {
      return {
        released: false,
        status: enrollment.resultsStatus.toLowerCase(),
        message: 'Results are not yet available. All sections must be graded.',
        enrollmentCode: enrollment.enrollmentCode,
        mockDate: enrollment.mockDate,
        package: enrollment.package.title,
      };
    }

    const payload = await this.buildReleasedPayload(enrollment);
    return {
      ...payload,
      pdfUrl: enrollment.resultPdfUrl,
      candidateName: enrollment.student.user.name,
      candidateEmail: enrollment.student.user.email,
      country: enrollment.student.country ?? null,
      candidateExamType: enrollment.student.examType,
      dateOfBirth: enrollment.student.dateOfBirth ?? null,
      sex: enrollment.student.sex ?? null,
      firstLanguage: enrollment.student.firstLanguage ?? null,
      // Partner centre that conducted this exam. Null for direct iTestU bookings.
      centre: enrollment.institution
        ? {
            name: enrollment.institution.name,
            logoUrl: enrollment.institution.logoUrl ?? null,
            city: enrollment.institution.city ?? null,
            code: enrollment.institution.slug
              .replace(/-/g, '')
              .slice(0, 8)
              .toUpperCase(),
          }
        : null,
      mockDate: enrollment.mockDate,
      issueDate: enrollment.updatedAt,
      schemeCode: enrollment.institution
        ? 'Partner Candidate'
        : 'Mock Candidate',
    };
  }

  async listForStudent(user: RequestUser) {
    if (!user.studentProfileId) {
      throw new ForbiddenException('Student profile required');
    }

    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        studentId: user.studentProfileId,
        resultsStatus: 'RELEASED',
      },
      include: {
        package: true,
        examSession: { include: { sectionAttempts: true } },
      },
      orderBy: { mockDate: 'desc' },
    });

    return Promise.all(
      enrollments.map(async (e) => {
        const attempts = e.examSession?.sectionAttempts ?? [];
        const bands: number[] = [];
        for (const attempt of attempts) {
          const band = await resolveAttemptBand(this.prisma, attempt);
          if (band != null) bands.push(band);
        }
        const overall = overallBandFromSkillBands(bands);

        return {
          enrollmentCode: e.enrollmentCode,
          mockDate: e.mockDate,
          package: e.package.title,
          overallBand: overall,
          pdfUrl: e.resultPdfUrl,
        };
      }),
    );
  }

  async getPendingForStudent(user: RequestUser) {
    if (!user.studentProfileId) {
      throw new ForbiddenException('Student profile required');
    }

    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        studentId: user.studentProfileId,
        resultsStatus: { not: 'RELEASED' },
        examSession: { isNot: null },
        status: {
          in: ['IN_PROGRESS', 'AWAITING_RESULTS', 'COMPLETED', 'ENROLLED'],
        },
      },
      include: { package: true },
      orderBy: { mockDate: 'desc' },
    });

    if (!enrollment) return null;

    const moduleCount = packageExamSkills(enrollment.package.skills).length;
    const moduleLabel =
      moduleCount === 1 ? 'module' : `${moduleCount} modules`;

    return {
      enrollmentCode: enrollment.enrollmentCode,
      mockDate: enrollment.mockDate,
      package: enrollment.package.title,
      packageSkills: packageExamSkills(enrollment.package.skills).map((s) =>
        s.toLowerCase(),
      ),
      resultsStatus: enrollment.resultsStatus.toLowerCase(),
      message:
        enrollment.status === 'AWAITING_RESULTS' ||
        enrollment.resultsStatus === 'PARTIAL'
          ? `Your examiner is finishing grading. Full results will appear here when all ${moduleLabel} are complete.`
          : 'Complete all exam sections to unlock your full band report.',
    };
  }

  async getPdfDownload(enrollmentId: string, user: RequestUser) {
    const enrollment = await this.findEnrollment(enrollmentId);
    this.assertAccess(enrollment, user);

    if (enrollment.resultsStatus !== 'RELEASED') {
      throw new NotFoundException('Results PDF is not available yet');
    }

    let buffer = await this.pdf.readPdfBuffer(enrollment.id);
    if (!buffer) {
      await this.pdf.generateForEnrollment(enrollment.id);
      buffer = await this.pdf.readPdfBuffer(enrollment.id);
    }

    if (!buffer) {
      throw new NotFoundException('Results PDF could not be generated');
    }

    return {
      buffer,
      filename: `itestu-report-${enrollment.enrollmentCode}.pdf`,
    };
  }

  private async findEnrollment(enrollmentId: string) {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        OR: [{ id: enrollmentId }, { enrollmentCode: enrollmentId }],
      },
      include: {
        student: { include: { user: true } },
        package: true,
        institution: true,
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

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    return enrollment;
  }

  private assertAccess(
    enrollment: { studentId: string },
    user: RequestUser,
  ) {
    if (
      user.role === 'STUDENT' &&
      enrollment.studentId !== user.studentProfileId
    ) {
      throw new ForbiddenException('Access denied');
    }
  }

  private async resolveAttemptBand(attempt: {
    skill: string;
    band: number | null;
    rawScore: number | null;
  }): Promise<number | null> {
    return resolveAttemptBand(this.prisma, attempt);
  }

  private deriveCentreNumber(institutionId: string | null): string {
    if (!institutionId) return 'ITU-001';
    const slug = institutionId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    return `ITU-${slug.slice(-4).padStart(4, '0')}`;
  }

  private async buildReleasedPayload(enrollment: {
    enrollmentCode: string;
    mockDate: Date;
    createdAt?: Date;
    updatedAt?: Date;
    institutionId?: string | null;
    student?: {
      country?: string | null;
      examType?: string | null;
      user?: { name?: string | null } | null;
    } | null;
    institution?: { name?: string | null; logoUrl?: string | null } | null;
    package: { title: string; skills: unknown };
    examSession?: {
      sectionAttempts: {
        skill: string;
        band: number | null;
        rawScore: number | null;
        writingSubmission?: { grade?: { feedback: string | null; criteriaScores: unknown } | null } | null;
        speakingSession?: { grade?: { feedback: string | null; criteriaScores: unknown } | null } | null;
      }[];
    } | null;
  }) {
    const attempts = enrollment.examSession?.sectionAttempts ?? [];
    const packageSkills = packageExamSkills(enrollment.package.skills);

    const skills = await Promise.all(
      attempts
        .filter((a) =>
          packageSkills.includes(a.skill as ExamSkill),
        )
        .map(async (a) => {
          const band = await this.resolveAttemptBand(a);
          return {
            skill: a.skill.toLowerCase(),
            band,
            rawScore: a.rawScore,
            feedback:
              a.writingSubmission?.grade?.feedback ??
              a.speakingSession?.grade?.feedback,
            criteriaScores:
              (a.writingSubmission?.grade?.criteriaScores as Record<
                string,
                number
              >) ??
              (a.speakingSession?.grade?.criteriaScores as Record<
                string,
                number
              >),
          };
        }),
    );

    const bands = skills
      .map((s) => s.band)
      .filter((b): b is number => b !== null);
    const overallBand = overallBandFromSkillBands(bands);

    return {
      released: true as const,
      enrollmentCode: enrollment.enrollmentCode,
      mockDate: enrollment.mockDate,
      package: enrollment.package.title,
      packageSkills: packageSkills.map((s) => s.toLowerCase()),
      overallBand,
      skills,
    };
  }
}
