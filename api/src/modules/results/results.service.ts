import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RequestUser } from '../../common/types/request-user';
import { PrismaService } from '../../prisma/prisma.service';
import { packageExamSkills } from '../content/package-skills';
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

    const payload = this.buildReleasedPayload(enrollment);
    return {
      ...payload,
      pdfUrl: enrollment.resultPdfUrl,
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

    return enrollments.map((e) => {
      const bands =
        e.examSession?.sectionAttempts
          .map((a) => a.band)
          .filter((b): b is number => b !== null) ?? [];
      const overall =
        bands.length > 0
          ? Math.round((bands.reduce((a, b) => a + b, 0) / bands.length) * 2) /
            2
          : null;

      return {
        enrollmentCode: e.enrollmentCode,
        mockDate: e.mockDate,
        package: e.package.title,
        overallBand: overall,
        pdfUrl: e.resultPdfUrl,
      };
    });
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

  private buildReleasedPayload(enrollment: {
    enrollmentCode: string;
    mockDate: Date;
    package: { title: string };
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
    const skills = attempts.map((a) => ({
      skill: a.skill.toLowerCase(),
      band: a.band,
      rawScore: a.rawScore,
      feedback:
        a.writingSubmission?.grade?.feedback ??
        a.speakingSession?.grade?.feedback,
      criteriaScores:
        (a.writingSubmission?.grade?.criteriaScores as Record<string, number>) ??
        (a.speakingSession?.grade?.criteriaScores as Record<string, number>),
    }));

    const bands = skills.map((s) => s.band).filter((b): b is number => b !== null);
    const overallBand =
      bands.length > 0
        ? Math.round((bands.reduce((a, b) => a + b, 0) / bands.length) * 2) / 2
        : null;

    return {
      released: true as const,
      enrollmentCode: enrollment.enrollmentCode,
      mockDate: enrollment.mockDate,
      package: enrollment.package.title,
      overallBand,
      skills,
    };
  }
}
