import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RequestUser } from '../../common/types/request-user';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ResultsService {
  constructor(private prisma: PrismaService) {}

  async getByEnrollment(enrollmentId: string, user: RequestUser) {
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

    if (
      user.role === 'STUDENT' &&
      enrollment.studentId !== user.studentProfileId
    ) {
      throw new ForbiddenException('Access denied');
    }

    if (enrollment.resultsStatus !== 'RELEASED') {
      return {
        released: false,
        status: enrollment.resultsStatus.toLowerCase(),
        message: 'Results are not yet available. All sections must be graded.',
      };
    }

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
      released: true,
      enrollmentCode: enrollment.enrollmentCode,
      mockDate: enrollment.mockDate,
      package: enrollment.package.title,
      overallBand,
      skills,
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
      const bands = e.examSession?.sectionAttempts
        .map((a) => a.band)
        .filter((b): b is number => b !== null) ?? [];
      const overall =
        bands.length > 0
          ? Math.round((bands.reduce((a, b) => a + b, 0) / bands.length) * 2) / 2
          : null;

      return {
        enrollmentCode: e.enrollmentCode,
        mockDate: e.mockDate,
        package: e.package.title,
        overallBand: overall,
      };
    });
  }
}
