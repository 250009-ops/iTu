import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { accrueTeacherGradingEarning } from '../../common/teacher-earnings';
import { validateBandScores } from './band-validation';
import { RequestUser } from '../../common/types/request-user';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ResultsReleaseService } from '../results/results-release.service';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class GradingService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private settings: SettingsService,
    private resultsRelease: ResultsReleaseService,
  ) {}

  async getWritingQueue(user: RequestUser) {
    if (!user.teacherProfileId) {
      throw new ForbiddenException('Teacher profile required');
    }

    const submissions = await this.prisma.writingSubmission.findMany({
      where: {
        teacherId: user.teacherProfileId,
        status: { in: ['PENDING', 'IN_REVIEW'] },
      },
      include: {
        sectionAttempt: {
          include: {
            session: {
              include: {
                enrollment: {
                  include: { student: { include: { user: true } } },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return submissions.map((s) => ({
      id: s.id,
      studentName: s.sectionAttempt.session.enrollment.student.user.name,
      date: s.createdAt,
      slaHours: s.slaDueAt
        ? Math.max(
            0,
            Math.round(
              (s.slaDueAt.getTime() - Date.now()) / (60 * 60 * 1000),
            ),
          )
        : 48,
      urgent:
        !!s.slaDueAt && s.slaDueAt.getTime() - Date.now() < 12 * 60 * 60 * 1000,
      status: s.status.toLowerCase(),
      task1WordCount: s.task1WordCount,
      task2WordCount: s.task2WordCount,
    }));
  }

  async getWritingSubmission(id: string, user: RequestUser) {
    const submission = await this.prisma.writingSubmission.findUnique({
      where: { id },
      include: {
        sectionAttempt: {
          include: {
            session: {
              include: {
                enrollment: {
                  include: { student: { include: { user: true } } },
                },
              },
            },
          },
        },
        grade: true,
      },
    });

    if (!submission) throw new NotFoundException('Submission not found');
    if (submission.teacherId !== user.teacherProfileId && user.role !== 'ADMIN') {
      throw new ForbiddenException('Not assigned to this submission');
    }

    return {
      id: submission.id,
      studentName:
        submission.sectionAttempt.session.enrollment.student.user.name,
      task1Text: submission.task1Text,
      task2Text: submission.task2Text,
      task1WordCount: submission.task1WordCount,
      task2WordCount: submission.task2WordCount,
      status: submission.status.toLowerCase(),
      grade: submission.grade
        ? {
            criteriaScores: submission.grade.criteriaScores,
            overallBand: submission.grade.overallBand,
            feedback: submission.grade.feedback,
          }
        : null,
    };
  }

  async scoreWriting(
    submissionId: string,
    user: RequestUser,
    body: {
      criteriaScores: Record<string, number>;
      overallBand: number;
      feedback?: string;
    },
  ) {
    if (!user.teacherProfileId) {
      throw new ForbiddenException('Teacher profile required');
    }

    validateBandScores('writing', body.criteriaScores, body.overallBand);

    const submission = await this.prisma.writingSubmission.findUnique({
      where: { id: submissionId },
      include: {
        grade: true,
        sectionAttempt: {
          include: {
            session: {
              include: {
                enrollment: {
                  include: { student: { include: { user: true } } },
                },
              },
            },
          },
        },
      },
    });
    if (!submission) throw new NotFoundException('Submission not found');

    const isFirstGrade = !submission.grade;
    const commission = await this.settings.getCommissionRates();

    await this.prisma.$transaction(async (tx) => {
      await tx.grade.upsert({
        where: { writingSubmissionId: submissionId },
        create: {
          writingSubmissionId: submissionId,
          gradedById: user.teacherProfileId!,
          criteriaScores: body.criteriaScores,
          overallBand: body.overallBand,
          feedback: body.feedback,
        },
        update: {
          criteriaScores: body.criteriaScores,
          overallBand: body.overallBand,
          feedback: body.feedback,
          gradedAt: new Date(),
        },
      });

      await tx.writingSubmission.update({
        where: { id: submissionId },
        data: { status: 'GRADED' },
      });

      await tx.sectionAttempt.update({
        where: { id: submission.sectionAttemptId },
        data: { band: body.overallBand },
      });

      if (isFirstGrade && user.teacherProfileId) {
        await accrueTeacherGradingEarning(
          tx,
          user.teacherProfileId,
          'writing',
          commission,
        );
      }
    });

    const enrollment =
      submission.sectionAttempt.session.enrollment;
    const studentUserId = enrollment.student.userId;

    await this.notifications.create(
      studentUserId,
      'Writing graded',
      `Your Writing section has been graded · band ${body.overallBand.toFixed(1)}.`,
      NotificationType.GRADING,
      '/student/results',
    );

    await this.resultsRelease.tryRelease(enrollment.id, studentUserId);
    return { graded: true, overallBand: body.overallBand };
  }

  async getSpeakingSession(id: string, user: RequestUser) {
    const session = await this.prisma.speakingSession.findUnique({
      where: { id },
      include: {
        sectionAttempt: {
          include: {
            session: {
              include: {
                enrollment: {
                  include: { student: { include: { user: true } } },
                },
              },
            },
          },
        },
        grade: true,
      },
    });

    if (!session) throw new NotFoundException('Speaking session not found');
    if (session.teacherId !== user.teacherProfileId && user.role !== 'ADMIN') {
      throw new ForbiddenException('Not assigned to this session');
    }

    return {
      id: session.id,
      studentName:
        session.sectionAttempt.session.enrollment.student.user.name,
      status: session.status.toLowerCase(),
      scheduledAt: session.scheduledAt,
      teacherNotes: session.teacherNotes,
      activePhase: session.activePhase ?? 'part1',
      examinerReady: session.examinerReady,
      recordingUrl: session.recordingUrl,
      grade: session.grade
        ? {
            criteriaScores: session.grade.criteriaScores,
            overallBand: session.grade.overallBand,
            feedback: session.grade.feedback,
          }
        : null,
    };
  }

  async scoreSpeaking(
    sessionId: string,
    user: RequestUser,
    body: {
      criteriaScores: Record<string, number>;
      overallBand: number;
      feedback?: string;
      teacherNotes?: string;
    },
  ) {
    if (!user.teacherProfileId) {
      throw new ForbiddenException('Teacher profile required');
    }

    validateBandScores('speaking', body.criteriaScores, body.overallBand);

    const session = await this.prisma.speakingSession.findUnique({
      where: { id: sessionId },
      include: {
        grade: true,
        sectionAttempt: {
          include: {
            session: {
              include: {
                enrollment: {
                  include: { student: { include: { user: true } } },
                },
              },
            },
          },
        },
      },
    });
    if (!session) throw new NotFoundException('Speaking session not found');

    const isFirstGrade = !session.grade;
    const commission = await this.settings.getCommissionRates();

    await this.prisma.$transaction(async (tx) => {
      await tx.grade.upsert({
        where: { speakingSessionId: sessionId },
        create: {
          speakingSessionId: sessionId,
          gradedById: user.teacherProfileId!,
          criteriaScores: body.criteriaScores,
          overallBand: body.overallBand,
          feedback: body.feedback,
        },
        update: {
          criteriaScores: body.criteriaScores,
          overallBand: body.overallBand,
          feedback: body.feedback,
          gradedAt: new Date(),
        },
      });

      await tx.speakingSession.update({
        where: { id: sessionId },
        data: {
          status: 'COMPLETED',
          teacherNotes: body.teacherNotes,
        },
      });

      await tx.sectionAttempt.update({
        where: { id: session.sectionAttemptId },
        data: { band: body.overallBand },
      });

      if (isFirstGrade && user.teacherProfileId) {
        await accrueTeacherGradingEarning(
          tx,
          user.teacherProfileId,
          'speaking',
          commission,
        );
      }
    });

    const enrollment = session.sectionAttempt.session.enrollment;
    const studentUserId = enrollment.student.userId;

    await this.notifications.create(
      studentUserId,
      'Speaking graded',
      `Your Speaking section has been graded · band ${body.overallBand.toFixed(1)}.`,
      NotificationType.GRADING,
      '/student/results',
    );

    await this.resultsRelease.tryRelease(enrollment.id, studentUserId);
    return { graded: true, overallBand: body.overallBand };
  }
}
