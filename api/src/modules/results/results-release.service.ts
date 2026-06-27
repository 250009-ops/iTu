import { Injectable } from '@nestjs/common';
import {
  EnrollmentStatus,
  ExamSessionState,
  ExamSkill,
  NotificationType,
  ResultsStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { packageExamSkills } from '../content/package-skills';
import { ResultsPdfService } from './results-pdf.service';

/**
 * Releases results once every section the package includes has been graded.
 * Package-aware: a Writing-Only or Speaking-Only package releases as soon as
 * its single section is graded — it no longer requires all four skills.
 */
@Injectable()
export class ResultsReleaseService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private resultsPdf: ResultsPdfService,
  ) {}

  async tryRelease(enrollmentId: string, studentUserId?: string): Promise<boolean> {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
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
    });

    if (!enrollment?.examSession) return false;
    if (enrollment.resultsStatus === ResultsStatus.RELEASED) return false;

    const requiredSkills = packageExamSkills(enrollment.package.skills);
    const attempts = enrollment.examSession.sectionAttempts;

    const isSkillGraded = (skill: ExamSkill): boolean => {
      const attempt = attempts.find((a) => a.skill === skill);
      if (!attempt) return false;
      if (skill === ExamSkill.WRITING) return !!attempt.writingSubmission?.grade;
      if (skill === ExamSkill.SPEAKING) return !!attempt.speakingSession?.grade;
      // Listening / Reading are auto-scored on submit — require submission plus a score.
      if (attempt.submittedAt == null) return false;
      if (attempt.band != null) return true;
      return attempt.rawScore != null;
    };

    const allGraded =
      requiredSkills.length > 0 && requiredSkills.every(isSkillGraded);
    if (!allGraded) return false;

    await this.prisma.$transaction([
      this.prisma.enrollment.update({
        where: { id: enrollmentId },
        data: {
          status: EnrollmentStatus.COMPLETED,
          resultsStatus: ResultsStatus.RELEASED,
        },
      }),
      this.prisma.examSession.update({
        where: { id: enrollment.examSession.id },
        data: { state: ExamSessionState.RESULTS_RELEASED },
      }),
    ]);

    if (studentUserId) {
      await this.notifications.create(
        studentUserId,
        'Results released',
        'Your mock exam results are now available.',
        NotificationType.RESULT,
        '/student/results',
      );
    }

    void this.resultsPdf.generateForEnrollment(enrollmentId);
    return true;
  }
}
