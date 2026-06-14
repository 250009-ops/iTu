import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EnrollmentStatus,
  ExamSessionState,
  ExamSkill,
  NotificationType,
  Prisma,
} from '@prisma/client';
import { RequestUser } from '../../common/types/request-user';
import { PrismaService } from '../../prisma/prisma.service';
import { AutoScoringService } from './auto-scoring.service';
import {
  assertTransition,
  getActiveStateForSkill,
  getSubmittedStateForSkill,
  skillForActiveState,
} from './exam-state-machine';
import { NotificationsService } from '../notifications/notifications.service';
import { SettingsService } from '../settings/settings.service';
import { SaveAnswersDto, SubmitSectionDto } from './dto/exam-session.dto';

@Injectable()
export class ExamSessionsService {
  constructor(
    private prisma: PrismaService,
    private autoScoring: AutoScoringService,
    private settings: SettingsService,
    private notifications: NotificationsService,
  ) {}

  async getByCode(sessionCode: string, user: RequestUser) {
    const session = await this.findSessionOrThrow(sessionCode);
    await this.assertSessionAccess(session.enrollment.studentId, user);
    return this.toSessionResponse(session);
  }

  async checkIn(sessionCode: string, user: RequestUser) {
    const session = await this.findSessionOrThrow(sessionCode);
    await this.assertSessionAccess(session.enrollment.studentId, user);

    assertTransition(session.state, ExamSessionState.CHECK_IN_OPEN);

    const updated = await this.prisma.examSession.update({
      where: { id: session.id },
      data: {
        state: ExamSessionState.CHECK_IN_OPEN,
        checkInAt: new Date(),
        version: { increment: 1 },
      },
      include: this.sessionInclude(),
    });

    return this.toSessionResponse(updated);
  }

  async startSection(sessionCode: string, skill: ExamSkill, user: RequestUser) {
    const session = await this.findSessionOrThrow(sessionCode);
    await this.assertSessionAccess(session.enrollment.studentId, user);

    const nextState = getActiveStateForSkill(skill);
    assertTransition(session.state, nextState);

    const durations = await this.settings.getSectionDurationsSec();
    const duration = durations[skill];
    const now = new Date();

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.sectionAttempt.upsert({
        where: {
          sessionId_skill: { sessionId: session.id, skill },
        },
        create: {
          sessionId: session.id,
          skill,
          startedAt: now,
          timeRemaining: duration,
        },
        update: {
          startedAt: now,
          timeRemaining: duration,
        },
      });

      if (skill === ExamSkill.SPEAKING) {
        const attempt = await tx.sectionAttempt.findUnique({
          where: {
            sessionId_skill: { sessionId: session.id, skill: ExamSkill.SPEAKING },
          },
        });
        if (attempt) {
          await tx.speakingSession.updateMany({
            where: { sectionAttemptId: attempt.id },
            data: { status: 'WAITING', activePhase: 'part1' },
          });
        }
      }

      return tx.examSession.update({
        where: { id: session.id, version: session.version },
        data: {
          state: nextState,
          version: { increment: 1 },
          sectionTimers: {
            ...(session.sectionTimers as object),
            [skill]: { startedAt: now.toISOString(), durationSec: duration },
          },
        },
        include: this.sessionInclude(),
      });
    });

    if (skill !== ExamSkill.LISTENING && skill !== ExamSkill.READING) {
      await this.prisma.enrollment.update({
        where: { id: session.enrollmentId },
        data: { status: EnrollmentStatus.IN_PROGRESS },
      });
    }

    return this.toSessionResponse(updated);
  }

  async saveAnswers(
    sessionCode: string,
    dto: SaveAnswersDto,
    user: RequestUser,
  ) {
    const session = await this.findSessionOrThrow(sessionCode);
    await this.assertSessionAccess(session.enrollment.studentId, user);

    const activeSkill = skillForActiveState(session.state);
    if (!activeSkill) {
      throw new BadRequestException('No active section to save answers for');
    }

    const attempt = await this.prisma.sectionAttempt.findUnique({
      where: {
        sessionId_skill: { sessionId: session.id, skill: activeSkill },
      },
    });
    if (!attempt) {
      throw new BadRequestException('Section attempt not found');
    }

    const entries = Object.entries(dto.answers);
    for (const [questionNumber, value] of entries) {
      await this.prisma.answer.upsert({
        where: {
          sectionAttemptId_questionNumber: {
            sectionAttemptId: attempt.id,
            questionNumber: Number(questionNumber),
          },
        },
        create: {
          sectionAttemptId: attempt.id,
          questionNumber: Number(questionNumber),
          questionType: 'unknown',
          value: value as Prisma.InputJsonValue,
        },
        update: {
          value: value as Prisma.InputJsonValue,
          revision: { increment: 1 },
        },
      });
    }

    return { saved: entries.length, skill: activeSkill };
  }

  async submitSection(
    sessionCode: string,
    dto: SubmitSectionDto,
    user: RequestUser,
  ) {
    const session = await this.findSessionOrThrow(sessionCode);
    await this.assertSessionAccess(session.enrollment.studentId, user);

    const submittedState = getSubmittedStateForSkill(dto.skill);
    assertTransition(session.state, submittedState);

    const attempt = await this.prisma.sectionAttempt.findUnique({
      where: {
        sessionId_skill: { sessionId: session.id, skill: dto.skill },
      },
      include: { answers: true },
    });
    if (!attempt) {
      throw new BadRequestException('Section attempt not found');
    }

    let rawScore: number | null = null;
    let band: number | null = null;

    if (
      dto.skill === ExamSkill.LISTENING ||
      dto.skill === ExamSkill.READING
    ) {
      const pkg = session.enrollment.package;
      const testId =
        dto.skill === ExamSkill.LISTENING
          ? pkg.listeningTestId
          : pkg.readingTestId;
      const test = testId
        ? await this.prisma.contentTest.findUnique({ where: { id: testId } })
        : null;
      const scored = await this.autoScoring.scoreListeningOrReading(
        dto.skill,
        attempt.answers.map((a) => ({
          questionNumber: a.questionNumber,
          value: a.value,
        })),
        test?.answerKey as Record<string, string | string[]> | null,
      );
      rawScore = scored.rawScore;
      band = scored.band;
    }

    const now = new Date();
    const nextState = this.getNextStateAfterSubmit(dto.skill);

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.sectionAttempt.update({
        where: { id: attempt.id },
        data: {
          submittedAt: now,
          rawScore,
          band,
          timeRemaining: 0,
        },
      });

      if (dto.skill === ExamSkill.WRITING) {
        await tx.writingSubmission.upsert({
          where: { sectionAttemptId: attempt.id },
          create: {
            sectionAttemptId: attempt.id,
            teacherId: session.enrollment.writingTeacherId ?? undefined,
            status: 'PENDING',
            slaDueAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
          },
          update: {},
        });
      }

      if (dto.skill === ExamSkill.SPEAKING) {
        const slot = session.enrollment.speakingSlotId
          ? await tx.teacherSlot.findUnique({
              where: { id: session.enrollment.speakingSlotId },
            })
          : null;
        await tx.speakingSession.upsert({
          where: { sectionAttemptId: attempt.id },
          create: {
            sectionAttemptId: attempt.id,
            teacherId: session.enrollment.speakingTeacherId ?? undefined,
            status: 'COMPLETED',
            scheduledAt: slot?.startsAt,
            endedAt: now,
          },
          update: { status: 'COMPLETED', endedAt: now },
        });
      }

      return tx.examSession.update({
        where: { id: session.id, version: session.version },
        data: {
          state: nextState,
          version: { increment: 1 },
        },
        include: this.sessionInclude(),
      });
    });

    if (nextState === ExamSessionState.AWAITING_GRADING) {
      await this.prisma.enrollment.update({
        where: { id: session.enrollmentId },
        data: { status: EnrollmentStatus.AWAITING_RESULTS },
      });
    }

    if (dto.skill === ExamSkill.WRITING) {
      const writingSubmission = await this.prisma.writingSubmission.findUnique({
        where: { sectionAttemptId: attempt.id },
        include: { teacher: { include: { user: true } } },
      });
      if (writingSubmission?.teacher) {
        await this.notifications.create(
          writingSubmission.teacher.userId,
          'Writing ready to grade',
          'A student writing submission is now in your queue.',
          NotificationType.GRADING,
          `/teacher/grading/${writingSubmission.id}`,
        );
      }
    }

    return this.toSessionResponse(updated);
  }

  async submitWriting(
    sessionCode: string,
    task1Text: string | undefined,
    task2Text: string | undefined,
    user: RequestUser,
  ) {
    const session = await this.findSessionOrThrow(sessionCode);
    await this.assertSessionAccess(session.enrollment.studentId, user);

    if (session.state !== ExamSessionState.WRITING_ACTIVE) {
      throw new BadRequestException('Writing section is not active');
    }

    const attempt = await this.prisma.sectionAttempt.findUnique({
      where: {
        sessionId_skill: { sessionId: session.id, skill: ExamSkill.WRITING },
      },
    });
    if (!attempt) {
      throw new BadRequestException('Writing attempt not found');
    }

    const countWords = (text: string) =>
      text.trim() ? text.trim().split(/\s+/).length : 0;

    await this.prisma.writingSubmission.upsert({
      where: { sectionAttemptId: attempt.id },
      create: {
        sectionAttemptId: attempt.id,
        teacherId: session.enrollment.writingTeacherId ?? undefined,
        task1Text: task1Text ?? '',
        task2Text: task2Text ?? '',
        task1WordCount: countWords(task1Text ?? ''),
        task2WordCount: countWords(task2Text ?? ''),
        status: 'PENDING',
        slaDueAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      },
      update: {
        task1Text: task1Text ?? '',
        task2Text: task2Text ?? '',
        task1WordCount: countWords(task1Text ?? ''),
        task2WordCount: countWords(task2Text ?? ''),
      },
    });

    return { saved: true };
  }

  async getTimer(sessionCode: string, user: RequestUser) {
    const session = await this.findSessionOrThrow(sessionCode);
    await this.assertSessionAccess(session.enrollment.studentId, user);

    const activeSkill = skillForActiveState(session.state);
    if (!activeSkill) {
      return { skill: null, remainingSec: 0, serverTime: new Date().toISOString() };
    }

    const attempt = await this.prisma.sectionAttempt.findUnique({
      where: {
        sessionId_skill: { sessionId: session.id, skill: activeSkill },
      },
    });

    const durations = await this.settings.getSectionDurationsSec();

    if (!attempt?.startedAt) {
      return {
        skill: activeSkill,
        remainingSec: durations[activeSkill],
        serverTime: new Date().toISOString(),
      };
    }

    const elapsed = Math.floor(
      (Date.now() - attempt.startedAt.getTime()) / 1000,
    );
    const duration = durations[activeSkill];
    const remainingSec = Math.max(0, duration - elapsed);

    if (remainingSec === 0 && attempt.timeRemaining !== 0) {
      await this.prisma.sectionAttempt.update({
        where: { id: attempt.id },
        data: { timeRemaining: 0 },
      });
    }

    return {
      skill: activeSkill,
      remainingSec,
      serverTime: new Date().toISOString(),
      expired: remainingSec === 0,
    };
  }

  async logIntegrity(
    sessionCode: string,
    event: string,
    metadata: Record<string, unknown> | undefined,
    user: RequestUser,
  ) {
    const session = await this.findSessionOrThrow(sessionCode);
    await this.assertSessionAccess(session.enrollment.studentId, user);

    const log = (session.integrityLog as unknown[]) ?? [];
    log.push({
      event,
      metadata,
      at: new Date().toISOString(),
      userId: user.id,
    });

    const flaggedEvents = ['tab_switch', 'paste_attempt', 'fullscreen_exit'];
    const integrity = flaggedEvents.includes(event) ? 'FLAGGED' : session.integrity;

    await this.prisma.examSession.update({
      where: { id: session.id },
      data: {
        integrityLog: log as Prisma.InputJsonValue,
        integrity,
      },
    });

    return { logged: true };
  }

  async getExamContent(sessionCode: string, skill: ExamSkill, user: RequestUser) {
    const session = await this.findSessionOrThrow(sessionCode);
    await this.assertSessionAccess(session.enrollment.studentId, user);

    const pkg = session.enrollment.package;
    const testIdMap: Record<ExamSkill, string | null | undefined> = {
      LISTENING: pkg.listeningTestId,
      READING: pkg.readingTestId,
      WRITING: pkg.writingTestId,
      SPEAKING: pkg.speakingBankId,
    };

    const testId = testIdMap[skill];
    if (!testId) {
      throw new NotFoundException(`No content configured for ${skill}`);
    }

    const test = await this.prisma.contentTest.findUnique({
      where: { id: testId },
      select: {
        id: true,
        code: true,
        title: true,
        type: true,
        content: true,
        durationMin: true,
      },
    });

    if (!test) {
      throw new NotFoundException('Content test not found');
    }

    return test;
  }

  private getNextStateAfterSubmit(skill: ExamSkill): ExamSessionState {
    switch (skill) {
      case ExamSkill.LISTENING:
        return ExamSessionState.LISTENING_SUBMITTED;
      case ExamSkill.READING:
        return ExamSessionState.READING_SUBMITTED;
      case ExamSkill.WRITING:
        return ExamSessionState.SPEAKING_SCHEDULED;
      case ExamSkill.SPEAKING:
        return ExamSessionState.AWAITING_GRADING;
      default:
        return ExamSessionState.AWAITING_GRADING;
    }
  }

  private async findSessionOrThrow(sessionCode: string) {
    const session = await this.prisma.examSession.findUnique({
      where: { sessionCode },
      include: this.sessionInclude(),
    });
    if (!session) {
      throw new NotFoundException(`Exam session ${sessionCode} not found`);
    }
    return session;
  }

  private async assertSessionAccess(studentId: string, user: RequestUser) {
    if (user.role === 'ADMIN') return;
    if (user.role === 'STUDENT' && user.studentProfileId === studentId) return;
    throw new ForbiddenException('Access denied to this exam session');
  }

  private sessionInclude() {
    return {
      enrollment: {
        include: {
          package: true,
          student: { include: { user: true } },
          writingTeacher: { include: { user: true } },
          speakingTeacher: { include: { user: true } },
        },
      },
      sectionAttempts: {
        include: {
          answers: true,
          writingSubmission: true,
          speakingSession: true,
        },
      },
    } satisfies Prisma.ExamSessionInclude;
  }

  private toSessionResponse(
    session: Prisma.ExamSessionGetPayload<{
      include: ReturnType<ExamSessionsService['sessionInclude']>;
    }>,
  ) {
    return {
      id: session.id,
      sessionCode: session.sessionCode,
      state: session.state.toLowerCase(),
      integrity: session.integrity.toLowerCase(),
      checkInAt: session.checkInAt,
      sectionTimers: session.sectionTimers,
      enrollment: {
        id: session.enrollment.id,
        enrollmentCode: session.enrollment.enrollmentCode,
        mockDate: session.enrollment.mockDate,
        status: session.enrollment.status.toLowerCase(),
        resultsStatus: session.enrollment.resultsStatus.toLowerCase(),
      },
      sections: session.sectionAttempts.map((a) => ({
        skill: a.skill.toLowerCase(),
        startedAt: a.startedAt,
        submittedAt: a.submittedAt,
        rawScore: a.rawScore,
        band: a.band,
        timeRemaining: a.timeRemaining,
      })),
    };
  }
}
