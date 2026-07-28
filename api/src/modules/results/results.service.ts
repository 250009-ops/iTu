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
  overallBandFromSkillBands,
  resolveAttemptBand,
} from '../../common/band-resolution';
import { ResultsPdfService } from './results-pdf.service';

type AttemptRow = {
  skill: string;
  band: number | null;
  rawScore: number | null;
  writingSubmission?: {
    grade?: {
      feedback: string | null;
      criteriaScores: unknown;
      overallBand?: number;
    } | null;
  } | null;
  speakingSession?: {
    grade?: {
      feedback: string | null;
      criteriaScores: unknown;
      overallBand?: number;
    } | null;
  } | null;
};

@Injectable()
export class ResultsService {
  constructor(
    private prisma: PrismaService,
    private pdf: ResultsPdfService,
  ) {}

  async getByEnrollment(enrollmentId: string, user: RequestUser) {
    const enrollment = await this.findEnrollment(enrollmentId);
    this.assertAccess(enrollment, user);

    const meta = {
      pdfUrl: enrollment.resultPdfUrl,
      candidateName: enrollment.student.user.name,
      candidateEmail: enrollment.student.user.email,
      country: enrollment.student.country ?? null,
      candidateExamType: enrollment.student.examType,
      dateOfBirth: enrollment.student.dateOfBirth ?? null,
      sex: enrollment.student.sex ?? null,
      firstLanguage: enrollment.student.firstLanguage ?? null,
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

    if (enrollment.resultsStatus === 'RELEASED') {
      const payload = await this.buildSkillsPayload(enrollment, true);
      return { ...payload, ...meta };
    }

    // Progressive release: show graded modules (e.g. Writing) before every
    // package skill is complete — common for institute Reading→Writing flows.
    const payload = await this.buildSkillsPayload(enrollment, false);
    const hasScores = payload.skills.some((s) => s.band != null);
    if (hasScores) {
      const pendingCount = payload.skills.filter((s) => s.band == null).length;
      return {
        ...payload,
        ...meta,
        status: enrollment.resultsStatus.toLowerCase(),
        message:
          pendingCount > 0
            ? `Some modules are graded. Full results unlock when all ${payload.packageSkills.length} modules are complete.`
            : 'Results are being finalised.',
      };
    }

    return {
      released: false,
      status: enrollment.resultsStatus.toLowerCase(),
      message: 'Results are not yet available. All sections must be graded.',
      enrollmentCode: enrollment.enrollmentCode,
      mockDate: enrollment.mockDate,
      package: enrollment.package.title,
      packageSkills: packageExamSkills(enrollment.package.skills).map((s) =>
        s.toLowerCase(),
      ),
    };
  }

  async listForStudent(user: RequestUser) {
    if (!user.studentProfileId) {
      throw new ForbiddenException('Student profile required');
    }

    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        studentId: user.studentProfileId,
        resultsStatus: { in: ['RELEASED', 'PARTIAL'] },
      },
      include: {
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
      orderBy: { mockDate: 'desc' },
    });

    return Promise.all(
      enrollments.map(async (e) => {
        const attempts = e.examSession?.sectionAttempts ?? [];
        const packageSkills = packageExamSkills(e.package.skills);
        const bands: number[] = [];
        for (const attempt of attempts) {
          if (!packageSkills.includes(attempt.skill as ExamSkill)) continue;
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
          resultsStatus: e.resultsStatus.toLowerCase(),
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
    enrollment: { studentId: string; institutionId: string | null },
    user: RequestUser,
  ) {
    if (
      user.role === 'STUDENT' &&
      enrollment.studentId !== user.studentProfileId
    ) {
      throw new ForbiddenException('Access denied');
    }
    if (user.role === 'INSTITUTION') {
      if (
        !user.institutionId ||
        enrollment.institutionId !== user.institutionId
      ) {
        throw new ForbiddenException('Access denied');
      }
    }
  }

  private async buildSkillsPayload(
    enrollment: {
      enrollmentCode: string;
      mockDate: Date;
      package: { title: string; skills: unknown };
      examSession?: { sectionAttempts: AttemptRow[] } | null;
    },
    fullyReleased: boolean,
  ) {
    const attempts = enrollment.examSession?.sectionAttempts ?? [];
    const packageSkills = packageExamSkills(enrollment.package.skills);

    // Always emit one row per package skill so Writing/Speaking tabs appear
    // even when only Reading has auto-scored so far. Also include any graded
    // attempt that is missing from package.skills (content misconfig).
    const skillSet = new Set<ExamSkill>(packageSkills);
    for (const attempt of attempts) {
      const skill = attempt.skill as ExamSkill;
      const graded =
        attempt.band != null ||
        attempt.rawScore != null ||
        !!attempt.writingSubmission?.grade ||
        !!attempt.speakingSession?.grade;
      if (graded) skillSet.add(skill);
    }
    const orderedSkills = (
      [
        ExamSkill.LISTENING,
        ExamSkill.READING,
        ExamSkill.WRITING,
        ExamSkill.SPEAKING,
      ] as ExamSkill[]
    ).filter((s) => skillSet.has(s));

    const skills = await Promise.all(
      orderedSkills.map(async (skill) => {
        const attempt = attempts.find((a) => a.skill === skill);
        const band = attempt
          ? await resolveAttemptBand(this.prisma, attempt)
          : null;
        return {
          skill: skill.toLowerCase(),
          band,
          rawScore: attempt?.rawScore ?? null,
          feedback:
            attempt?.writingSubmission?.grade?.feedback ??
            attempt?.speakingSession?.grade?.feedback ??
            null,
          criteriaScores:
            (attempt?.writingSubmission?.grade?.criteriaScores as Record<
              string,
              number
            >) ??
            (attempt?.speakingSession?.grade?.criteriaScores as Record<
              string,
              number
            >) ??
            undefined,
        };
      }),
    );

    const bands = skills
      .map((s) => s.band)
      .filter((b): b is number => b !== null);
    const overallBand = overallBandFromSkillBands(bands);

    return {
      released: fullyReleased,
      partial: !fullyReleased && bands.length > 0,
      enrollmentCode: enrollment.enrollmentCode,
      mockDate: enrollment.mockDate,
      package: enrollment.package.title,
      packageSkills: orderedSkills.map((s) => s.toLowerCase()),
      overallBand,
      skills,
    };
  }
}
