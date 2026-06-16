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
import { AuditAction } from '../../common/audit/audit.actions';
import { AuditService } from '../../common/audit/audit.service';
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
import { ExamTimerService } from './exam-timer.service';

@Injectable()
export class ExamSessionsService {
  constructor(
    private prisma: PrismaService,
    private autoScoring: AutoScoringService,
    private settings: SettingsService,
    private notifications: NotificationsService,
    private examTimer: ExamTimerService,
    private audit: AuditService,
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

    await this.audit.log({
      userId: user.id,
      action: AuditAction.EXAM_CHECK_IN,
      entity: 'exam_session',
      entityId: session.id,
      metadata: { sessionCode },
    });

    return this.toSessionResponse(updated);
  }

  async startSection(sessionCode: string, skill: ExamSkill, user: RequestUser) {
    return this.examTimer.withSessionLock(sessionCode, async () => {
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

      await this.examTimer.setSectionTimer(session.id, skill, now, duration);

      if (skill !== ExamSkill.LISTENING && skill !== ExamSkill.READING) {
        await this.prisma.enrollment.update({
          where: { id: session.enrollmentId },
          data: { status: EnrollmentStatus.IN_PROGRESS },
        });
      }

      await this.audit.log({
        userId: user.id,
        action: AuditAction.EXAM_SECTION_START,
        entity: 'exam_session',
        entityId: session.id,
        metadata: { sessionCode, skill: skill.toLowerCase(), durationSec: duration },
      });

      return this.toSessionResponse(updated);
    });
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
    return this.examTimer.withSessionLock(sessionCode, async () => {
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

      await this.examTimer.clearSectionTimer(session.id, dto.skill);

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

      await this.audit.log({
        userId: user.id,
        action: AuditAction.EXAM_SECTION_SUBMIT,
        entity: 'exam_session',
        entityId: session.id,
        metadata: {
          sessionCode,
          skill: dto.skill.toLowerCase(),
          rawScore,
          band,
          nextState,
        },
      });

      return this.toSessionResponse(updated);
    });
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
      return {
        skill: null,
        remainingSec: 0,
        serverTime: new Date().toISOString(),
        redisBacked: this.examTimer.isRedisBacked(),
      };
    }

    const durations = await this.settings.getSectionDurationsSec();
    const duration = durations[activeSkill];

    const redisTimer = await this.examTimer.getSectionTimer(
      session.id,
      activeSkill,
    );
    if (redisTimer) {
      const remainingSec = this.examTimer.remainingSeconds(redisTimer);
      return {
        skill: activeSkill,
        remainingSec,
        serverTime: new Date().toISOString(),
        expired: remainingSec === 0,
        redisBacked: true,
      };
    }

    const attempt = await this.prisma.sectionAttempt.findUnique({
      where: {
        sessionId_skill: { sessionId: session.id, skill: activeSkill },
      },
    });

    if (!attempt?.startedAt) {
      return {
        skill: activeSkill,
        remainingSec: duration,
        serverTime: new Date().toISOString(),
        redisBacked: this.examTimer.isRedisBacked(),
      };
    }

    const elapsed = Math.floor(
      (Date.now() - attempt.startedAt.getTime()) / 1000,
    );
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
      redisBacked: false,
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

    const integritySettings = (await this.settings.getSection(
      'exam_integrity',
    )) as {
      flagOnTabSwitch?: boolean;
      flagOnPaste?: boolean;
      flagOnFullscreenExit?: boolean;
      flagOnAudioSeek?: boolean;
      maxWarningsBeforeFlag?: number;
    };

    const eventSettings: Record<string, boolean | undefined> = {
      tab_switch: integritySettings.flagOnTabSwitch,
      paste_attempt: integritySettings.flagOnPaste,
      fullscreen_exit: integritySettings.flagOnFullscreenExit,
      audio_seek_attempt: integritySettings.flagOnAudioSeek,
    };

    const trackableEvents = Object.keys(eventSettings);
    const eventEnabled = trackableEvents.includes(event)
      ? eventSettings[event] !== false
      : false;

    const log = (session.integrityLog as unknown[]) ?? [];
    log.push({
      event,
      metadata,
      at: new Date().toISOString(),
      userId: user.id,
    });

    const maxWarnings = integritySettings.maxWarningsBeforeFlag ?? 1;
    const offenseCount = log.filter(
      (entry) =>
        typeof entry === 'object' &&
        entry !== null &&
        trackableEvents.includes((entry as { event?: string }).event ?? ''),
    ).length;

    let integrity = session.integrity;
    if (eventEnabled && offenseCount >= maxWarnings) {
      integrity = 'FLAGGED';
    }

    await this.prisma.examSession.update({
      where: { id: session.id },
      data: {
        integrityLog: log as Prisma.InputJsonValue,
        integrity,
      },
    });

    if (integrity === 'FLAGGED' && session.integrity !== 'FLAGGED') {
      await this.audit.log({
        userId: user.id,
        action: AuditAction.EXAM_INTEGRITY_FLAG,
        entity: 'exam_session',
        entityId: session.id,
        metadata: { sessionCode, event, offenseCount, ...metadata },
      });
    }

    return { logged: true, integrity: integrity.toLowerCase(), offenseCount };
  }

  async getAdminSessionDetail(sessionCode: string) {
    const session = await this.findSessionOrThrow(sessionCode);
    const activeSkill = skillForActiveState(session.state);
    const attempt = activeSkill
      ? session.sectionAttempts.find((a) => a.skill === activeSkill)
      : undefined;

    return {
      id: session.id,
      sessionCode: session.sessionCode,
      state: session.state,
      integrity: session.integrity.toLowerCase(),
      integrityLog: (session.integrityLog as unknown[]) ?? [],
      studentName: session.enrollment.student.user.name,
      country: session.enrollment.student.country ?? '—',
      skill: activeSkill?.toLowerCase() ?? null,
      sectionStartedAt: attempt?.startedAt?.toISOString() ?? null,
      enrollmentCode: session.enrollment.enrollmentCode,
    };
  }

  async adminForceSubmit(sessionCode: string, user: RequestUser) {
    const session = await this.findSessionOrThrow(sessionCode);
    const activeSkill = skillForActiveState(session.state);
    if (!activeSkill) {
      throw new BadRequestException('No active section to force submit');
    }

    const result = await this.submitSection(
      sessionCode,
      { skill: activeSkill },
      user,
    );

    await this.audit.log({
      userId: user.id,
      action: AuditAction.EXAM_FORCE_SUBMIT,
      entity: 'exam_session',
      entityId: session.id,
      metadata: { sessionCode, skill: activeSkill.toLowerCase() },
    });

    return result;
  }

  async adminReviewIntegrity(
    sessionCode: string,
    decision: 'clear' | 'uphold',
    note: string | undefined,
    user: RequestUser,
  ) {
    const session = await this.findSessionOrThrow(sessionCode);
    const log = (session.integrityLog as unknown[]) ?? [];
    log.push({
      event: 'admin_review',
      metadata: { decision, note },
      at: new Date().toISOString(),
      userId: user.id,
    });

    const integrity = decision === 'clear' ? 'CLEAR' : 'FLAGGED';

    await this.prisma.examSession.update({
      where: { id: session.id },
      data: {
        integrity,
        integrityLog: log as Prisma.InputJsonValue,
      },
    });

    await this.audit.log({
      userId: user.id,
      action: AuditAction.EXAM_INTEGRITY_REVIEW,
      entity: 'exam_session',
      entityId: session.id,
      metadata: { sessionCode, decision, note },
    });

    return { integrity: integrity.toLowerCase(), reviewed: true };
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
        mediaAssets: {
          select: { key: true, url: true },
        },
      },
    });

    if (!test) {
      throw new NotFoundException('Content test not found');
    }

    if (skill === ExamSkill.LISTENING && test.mediaAssets.length > 0) {
      const fullAudio = test.mediaAssets.find(
        (asset) => asset.key === 'full-audio',
      );

      const audioTracks = fullAudio
        ? [
            {
              part: 1,
              url: fullAudio.url,
              title: 'Listening',
            },
          ]
        : test.mediaAssets
            .filter((asset) => asset.key.startsWith('part-'))
            .map((asset) => ({
              part: Number(asset.key.replace('part-', '')),
              url: asset.url,
            }))
            .filter((track) => Number.isFinite(track.part))
            .sort((a, b) => a.part - b.part);

      const { mediaAssets: _assets, ...rest } = test;
      const content = {
        ...(rest.content as Record<string, unknown>),
        audioTracks,
      };

      return { ...rest, content };
    }

    const { mediaAssets: _assets, ...rest } = test;
    return rest;
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
