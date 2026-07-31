import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { accrueTeacherGradingEarning } from '../../common/teacher-earnings';
import {
  studentResultsPath,
} from '../../common/student-portal-paths';
import { validateBandScores } from './band-validation';
import {
  validateWritingCriteriaScores,
  type WritingCriteriaScoresPayload,
} from './writing-band-validation';
import { WritingAiEvaluationService } from './writing-ai-evaluation.service';
import { RequestUser } from '../../common/types/request-user';
import { isWritingReadyForTeacherQueue } from '../../common/grading/writing-queue-visibility';
import { assertTeacherSkillAccess } from '../../common/teacher-speciality';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ResultsReleaseService } from '../results/results-release.service';
import { RealtimeService } from '../realtime/realtime.service';
import { SettingsService } from '../settings/settings.service';
import { injectWritingTask1ImageUrl } from '../content/content.utils';

type WritingTask1Visual = {
  kind: 'bar' | 'line' | 'pie' | 'table' | 'process' | 'map';
  caption: string;
  imageUrl?: string;
  alt?: string;
};

@Injectable()
export class GradingService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private settings: SettingsService,
    private resultsRelease: ResultsReleaseService,
    private writingAi: WritingAiEvaluationService,
    private realtime: RealtimeService,
  ) {}

  async getWritingQueue(user: RequestUser) {
    const hub = await this.getWritingGradingHub(user);
    return [...hub.pending, ...hub.inReview];
  }

  async getWritingGradingHub(user: RequestUser) {
    if (!user.teacherProfileId) {
      throw new ForbiddenException('Teacher profile required');
    }
    await this.requireTeacherSkill(user, 'writing');

    const submissions = await this.prisma.writingSubmission.findMany({
      where: { teacherId: user.teacherProfileId },
      include: {
        grade: true,
        aiEvaluation: true,
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

    const mapRow = (s: (typeof submissions)[number]) => {
      const slaMinutesRemaining = s.slaDueAt
        ? Math.round((s.slaDueAt.getTime() - Date.now()) / 60_000)
        : null;

      return {
        id: s.id,
        studentName: s.sectionAttempt.session.enrollment.student.user.name,
        submittedAt: s.createdAt,
        task1WordCount: s.task1WordCount,
        task2WordCount: s.task2WordCount,
        status: s.status.toLowerCase(),
        slaMinutesRemaining,
        grade: s.grade
          ? {
              overallBand: s.grade.overallBand,
              criteriaScores: s.grade.criteriaScores as Record<string, unknown>,
              gradedAt: s.grade.gradedAt,
            }
          : null,
      };
    };

    const isQueueVisible = (s: (typeof submissions)[number]) =>
      s.status === 'IN_REVIEW' ||
      isWritingReadyForTeacherQueue(s.aiEvaluation);

    const pending = submissions
      .filter((s) => s.status === 'PENDING')
      .filter(isQueueVisible)
      .map(mapRow);
    const inReview = submissions
      .filter((s) => s.status === 'IN_REVIEW')
      .filter(isQueueVisible)
      .map(mapRow);
    const completed = submissions
      .filter((s) => s.status === 'GRADED')
      .map(mapRow);

    const actionable = [...pending, ...inReview];
    const onTimeCount = actionable.filter(
      (s) => s.slaMinutesRemaining === null || s.slaMinutesRemaining > 0,
    ).length;
    const onTimeSlaPercent =
      actionable.length > 0
        ? Math.round((onTimeCount / actionable.length) * 100)
        : 100;
    const overdueCount = actionable.filter(
      (s) => s.slaMinutesRemaining !== null && s.slaMinutesRemaining <= 0,
    ).length;

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const gradedThisPeriod = completed.filter(
      (s) => s.grade?.gradedAt && new Date(s.grade.gradedAt) >= monthStart,
    ).length;

    return {
      pending,
      inReview,
      completed,
      counts: {
        pending: pending.length,
        inReview: inReview.length,
        completed: completed.length,
      },
      stats: {
        pendingGrading: pending.length,
        onTimeSlaPercent,
        overdueCount,
        gradedThisPeriod,
      },
    };
  }

  async getSpeakingQueue(user: RequestUser) {
    if (!user.teacherProfileId) {
      throw new ForbiddenException('Teacher profile required');
    }
    await this.requireTeacherSkill(user, 'speaking');

    const sessions = await this.prisma.speakingSession.findMany({
      where: {
        teacherId: user.teacherProfileId,
        status: 'COMPLETED',
        grade: null,
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
      orderBy: { endedAt: 'asc' },
    });

    return sessions.map((s) => ({
      id: s.id,
      studentName:
        s.sectionAttempt.session.enrollment.student.user.name,
      date: s.endedAt ?? s.createdAt,
      status: 'pending_grading',
      scheduledAt: s.scheduledAt,
    }));
  }

  async getWritingSubmission(id: string, user: RequestUser) {
    await this.requireTeacherSkill(user, 'writing');

    const submission = await this.prisma.writingSubmission.findUnique({
      where: { id },
      include: {
        sectionAttempt: {
          include: {
            contentTest: {
              select: {
                content: true,
                mediaAssets: {
                  select: { key: true, url: true, sizeBytes: true },
                },
              },
            },
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
        aiEvaluation: true,
      },
    });

    if (!submission) throw new NotFoundException('Submission not found');
    if (submission.teacherId !== user.teacherProfileId && user.role !== 'ADMIN') {
      throw new ForbiddenException('Not assigned to this submission');
    }

    if (
      submission.status !== 'GRADED' &&
      !isWritingReadyForTeacherQueue(submission.aiEvaluation)
    ) {
      throw new NotFoundException('Submission is not ready for grading yet');
    }

    if (submission.status !== 'GRADED') {
      void this.writingAi.getOrTriggerEvaluation(id);
    }

    const contentTest = submission.sectionAttempt.contentTest;
    const rawContent = contentTest?.content;
    const mediaAssets = contentTest?.mediaAssets ?? [];
    const content = injectWritingTask1ImageUrl(rawContent, mediaAssets) as
      | {
          tasks?: {
            taskNumber?: number;
            prompt?: string;
            visual?: WritingTask1Visual;
          }[];
        }
      | undefined;
    const tasks = content?.tasks ?? [];
    const task1 = tasks.find((t) => t.taskNumber === 1);
    const task2 = tasks.find((t) => t.taskNumber === 2);
    const task1Visual = task1?.visual?.kind ? task1.visual : null;

    const slaMinutesRemaining = submission.slaDueAt
      ? Math.round((submission.slaDueAt.getTime() - Date.now()) / 60_000)
      : null;

    return {
      id: submission.id,
      studentName:
        submission.sectionAttempt.session.enrollment.student.user.name,
      task1Text: submission.task1Text,
      task2Text: submission.task2Text,
      task1Prompt: task1?.prompt ?? null,
      task2Prompt: task2?.prompt ?? null,
      task1Visual,
      task1VisualCaption: task1Visual?.caption ?? null,
      task2VisualCaption: task2?.visual?.caption ?? null,
      task1WordCount: submission.task1WordCount,
      task2WordCount: submission.task2WordCount,
      submittedAt:
        submission.sectionAttempt.submittedAt ?? submission.updatedAt,
      slaMinutesRemaining,
      status: submission.status.toLowerCase(),
      aiConfigured: this.writingAi.isAiUsable(submission.aiEvaluation),
      grade: submission.grade
        ? {
            criteriaScores: submission.grade.criteriaScores,
            overallBand: submission.grade.overallBand,
            feedback: submission.grade.feedback,
          }
        : null,
      aiEvaluation:
        submission.aiEvaluation &&
        this.writingAi.isAiUsable(submission.aiEvaluation)
          ? {
              status: submission.aiEvaluation.status.toLowerCase(),
              task1Annotations: submission.aiEvaluation.task1Annotations,
              task2Annotations: submission.aiEvaluation.task2Annotations,
              task1SuggestedScores: submission.aiEvaluation.task1SuggestedScores,
              task2SuggestedScores: submission.aiEvaluation.task2SuggestedScores,
              modelVersion: submission.aiEvaluation.modelVersion,
              generatedAt: submission.aiEvaluation.generatedAt,
            }
          : null,
    };
  }

  async triggerWritingAiEvaluation(id: string, user: RequestUser) {
    await this.requireTeacherSkill(user, 'writing');

    const submission = await this.prisma.writingSubmission.findUnique({
      where: { id },
      select: { teacherId: true },
    });
    if (!submission) throw new NotFoundException('Submission not found');
    if (submission.teacherId !== user.teacherProfileId && user.role !== 'ADMIN') {
      throw new ForbiddenException('Not assigned to this submission');
    }

    if (!this.writingAi.isConfigured()) {
      return {
        triggered: false,
        reason: 'AI features disabled or OPENAI_API_KEY not configured',
      };
    }

    await this.writingAi.retryEvaluation(id);
    return { triggered: true };
  }

  async scoreWriting(
    submissionId: string,
    user: RequestUser,
    body: {
      criteriaScores: WritingCriteriaScoresPayload;
      overallBand: number;
      feedback?: string;
    },
  ) {
    if (!user.teacherProfileId) {
      throw new ForbiddenException('Teacher profile required');
    }
    await this.requireTeacherSkill(user, 'writing');

    const validatedScores = validateWritingCriteriaScores(
      body.criteriaScores as unknown as Record<string, unknown>,
      body.overallBand,
    );

    const combinedFeedback =
      body.feedback?.trim() ||
      [
        validatedScores.task1.feedback?.trim(),
        validatedScores.task2.feedback?.trim(),
      ]
        .filter(Boolean)
        .join('\n\n') ||
      undefined;

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
    if (submission.teacherId !== user.teacherProfileId && user.role !== 'ADMIN') {
      throw new ForbiddenException('Not assigned to this submission');
    }

    const isFirstGrade = !submission.grade;
    const commission = await this.settings.getCommissionRates();
    const netPayout =
      isFirstGrade && user.teacherProfileId
        ? await this.settings.resolveTeacherNetPayout(
            user.teacherProfileId,
            'writing',
          )
        : 0;

    await this.prisma.$transaction(async (tx) => {
      await tx.grade.upsert({
        where: { writingSubmissionId: submissionId },
        create: {
          writingSubmissionId: submissionId,
          gradedById: user.teacherProfileId!,
          criteriaScores: validatedScores,
          overallBand: body.overallBand,
          feedback: combinedFeedback,
        },
        update: {
          criteriaScores: validatedScores,
          overallBand: body.overallBand,
          feedback: combinedFeedback,
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
          netPayout,
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
      studentResultsPath(
        enrollment.institutionId,
        enrollment.enrollmentCode,
      ),
    );

    await this.resultsRelease.tryRelease(enrollment.id, studentUserId);
    if (user.teacherProfileId) {
      this.realtime.notifyTeacherBadges(user.teacherProfileId);
    }
    return { graded: true, overallBand: body.overallBand };
  }

  async getSpeakingSession(id: string, user: RequestUser) {
    await this.requireTeacherSkill(user, 'speaking');

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
    await this.requireTeacherSkill(user, 'speaking');

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
    if (session.teacherId !== user.teacherProfileId && user.role !== 'ADMIN') {
      throw new ForbiddenException('Not assigned to this session');
    }

    const isFirstGrade = !session.grade;
    const commission = await this.settings.getCommissionRates();
    const netPayout =
      isFirstGrade && user.teacherProfileId
        ? await this.settings.resolveTeacherNetPayout(
            user.teacherProfileId,
            'speaking',
          )
        : 0;

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
          activePhase: 'complete',
          endedAt: session.endedAt ?? new Date(),
          teacherNotes: body.teacherNotes,
        },
      });

      await tx.sectionAttempt.update({
        where: { id: session.sectionAttemptId },
        data: {
          band: body.overallBand,
          submittedAt: session.sectionAttempt.submittedAt ?? new Date(),
        },
      });

      if (isFirstGrade && user.teacherProfileId) {
        await accrueTeacherGradingEarning(
          tx,
          user.teacherProfileId,
          netPayout,
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
      studentResultsPath(
        enrollment.institutionId,
        enrollment.enrollmentCode,
      ),
    );

    await this.resultsRelease.tryRelease(enrollment.id, studentUserId);
    if (user.teacherProfileId) {
      this.realtime.notifyTeacherBadges(user.teacherProfileId);
    }
    return { graded: true, overallBand: body.overallBand };
  }

  private async requireTeacherSkill(
    user: RequestUser,
    skill: 'speaking' | 'writing',
  ): Promise<void> {
    if (user.role === 'ADMIN') return;
    if (!user.teacherProfileId) {
      throw new ForbiddenException('Teacher profile required');
    }
    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { id: user.teacherProfileId },
      select: { speciality: true },
    });
    if (!teacher) throw new NotFoundException('Teacher not found');
    assertTeacherSkillAccess(teacher.speciality, skill);
  }
}
