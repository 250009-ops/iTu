import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SpeakingSessionStatus } from '@prisma/client';
import { RequestUser } from '../../common/types/request-user';
import { PrismaService } from '../../prisma/prisma.service';
import {
  SPEAKING_PHASES,
  type SpeakingPhase,
  UpdateSpeakingStateDto,
} from './dto/update-speaking-state.dto';
import { LivekitService } from './livekit.service';

type PartTimestamps = Record<string, string> & {
  egressId?: string;
  recordingStartedAt?: string;
};

const speakingSessionInclude = {
  sectionAttempt: {
    include: {
      session: {
        include: {
          enrollment: {
            include: {
              student: { include: { user: true } },
              speakingTeacher: { include: { user: true } },
            },
          },
        },
      },
    },
  },
  teacher: { include: { user: true } },
} as const;

@Injectable()
export class SpeakingService {
  constructor(
    private prisma: PrismaService,
    private livekit: LivekitService,
  ) {}

  async getByExamSessionCode(sessionCode: string, user: RequestUser) {
    const examSession = await this.prisma.examSession.findUnique({
      where: { sessionCode },
      include: {
        enrollment: { include: { student: true } },
        sectionAttempts: { include: { speakingSession: true } },
      },
    });

    if (!examSession) {
      throw new NotFoundException('Exam session not found');
    }

    if (
      examSession.enrollment.studentId !== user.studentProfileId &&
      user.role !== 'ADMIN'
    ) {
      throw new ForbiddenException('Not your exam session');
    }

    const speakingAttempt = examSession.sectionAttempts.find(
      (a) => a.skill === 'SPEAKING',
    );
    const speakingSession = speakingAttempt?.speakingSession;

    if (!speakingSession) {
      throw new NotFoundException('Speaking session not found for this exam');
    }

    const examiner = examSession.enrollment.speakingTeacherId
      ? await this.prisma.teacherProfile.findUnique({
          where: { id: examSession.enrollment.speakingTeacherId },
          include: { user: true },
        })
      : null;

    return this.toStateResponse(speakingSession, {
      examinerName: examiner?.user.name ?? 'Assigned examiner',
      examinerTitle: 'Speaking Examiner · IELTS Certified',
      sessionCode,
    });
  }

  async joinSession(speakingSessionId: string, user: RequestUser) {
    const session = await this.prisma.speakingSession.findUnique({
      where: { id: speakingSessionId },
      include: speakingSessionInclude,
    });

    if (!session) {
      throw new NotFoundException('Speaking session not found');
    }

    const role = this.resolveRole(session, user);
    const roomName = this.livekit.roomNameForSession(session.id);
    const partTimestamps = this.partTimestamps(session.partTimestamps);

    const now = new Date();
    const updates: {
      status?: SpeakingSessionStatus;
      examinerReady?: boolean;
      startedAt?: Date;
      partTimestamps?: PartTimestamps;
    } = {};

    if (role === 'examiner') {
      updates.examinerReady = true;
      if (
        session.status === SpeakingSessionStatus.SCHEDULED ||
        session.status === SpeakingSessionStatus.WAITING
      ) {
        updates.status = SpeakingSessionStatus.WAITING;
      }
    } else if (
      session.status === SpeakingSessionStatus.SCHEDULED ||
      session.status === SpeakingSessionStatus.WAITING
    ) {
      updates.status = SpeakingSessionStatus.ACTIVE;
      updates.startedAt = session.startedAt ?? now;
    }

    if (Object.keys(updates).length > 0) {
      await this.prisma.speakingSession.update({
        where: { id: session.id },
        data: updates,
      });
    }

    if (
      role === 'student' &&
      updates.status === SpeakingSessionStatus.ACTIVE &&
      !partTimestamps.egressId &&
      this.livekit.isRecordingEnabled()
    ) {
      // Defer recording so camera/mic publish is not competing with egress startup.
      void this.startRecordingSoon(roomName, session.id);
    }

    if (!this.livekit.isConfigured()) {
      return {
        token: '',
        serverUrl: '',
        roomName,
        role,
        speakingSessionId: session.id,
        livekitConfigured: false,
        recordingEnabled: false,
      };
    }

    const join = await this.livekit.createJoinToken({
      roomName,
      identity: user.id,
      name: user.name ?? user.email,
      role: role === 'examiner' ? 'examiner' : 'student',
    });

    return {
      ...join,
      role,
      speakingSessionId: session.id,
      livekitConfigured: true,
      recordingEnabled: this.livekit.isRecordingEnabled(),
    };
  }

  async getState(speakingSessionId: string, user: RequestUser) {
    const session = await this.assertAccess(speakingSessionId, user);
    return this.toStateResponse(session);
  }

  async updateState(
    speakingSessionId: string,
    user: RequestUser,
    dto: UpdateSpeakingStateDto,
  ) {
    const session = await this.assertAccess(speakingSessionId, user);
    const role = this.resolveRole(session, user);

    if (role !== 'examiner') {
      throw new ForbiddenException('Only the examiner can update session state');
    }

    if (dto.activePhase && !SPEAKING_PHASES.includes(dto.activePhase)) {
      throw new BadRequestException('Invalid speaking phase');
    }

    const now = new Date();
    const partTimestamps = this.partTimestamps(session.partTimestamps);

    if (dto.activePhase) {
      partTimestamps[dto.activePhase] = now.toISOString();
    }

    const data: {
      activePhase?: SpeakingPhase;
      examinerReady?: boolean;
      status?: SpeakingSessionStatus;
      startedAt?: Date;
      endedAt?: Date;
      partTimestamps?: PartTimestamps;
      recordingUrl?: string;
    } = {
      partTimestamps,
    };

    if (dto.activePhase) {
      data.activePhase = dto.activePhase;
      if (session.status !== SpeakingSessionStatus.ACTIVE) {
        data.status = SpeakingSessionStatus.ACTIVE;
        data.startedAt = session.startedAt ?? now;
      }
    }

    if (dto.examinerReady !== undefined) {
      data.examinerReady = dto.examinerReady;
    }

    if (dto.endSession) {
      data.status = SpeakingSessionStatus.COMPLETED;
      data.activePhase = 'complete';
      data.endedAt = now;
      partTimestamps.complete = now.toISOString();
      data.partTimestamps = partTimestamps;

      if (partTimestamps.egressId && !session.recordingUrl) {
        const recordingUrl = await this.livekit.stopRoomRecording(
          partTimestamps.egressId,
        );
        if (recordingUrl) {
          data.recordingUrl = recordingUrl;
        }
      }
    }

    const updated = await this.prisma.speakingSession.update({
      where: { id: speakingSessionId },
      data,
      include: speakingSessionInclude,
    });

    return this.toStateResponse(updated);
  }

  async handleEgressEnded(roomName: string, recordingUrl: string | null) {
    const speakingSessionId = this.livekit.speakingSessionIdFromRoom(roomName);
    if (!speakingSessionId || !recordingUrl) return;

    await this.prisma.speakingSession.updateMany({
      where: { id: speakingSessionId, recordingUrl: null },
      data: { recordingUrl },
    });
  }

  private startRecordingSoon(roomName: string, speakingSessionId: string) {
    setTimeout(() => {
      void (async () => {
        const current = await this.prisma.speakingSession.findUnique({
          where: { id: speakingSessionId },
        });
        if (!current) return;

        const timestamps = this.partTimestamps(current.partTimestamps);
        if (timestamps.egressId) return;

        const egressId = await this.livekit.startRoomRecording(
          roomName,
          speakingSessionId,
        );
        if (!egressId) return;

        await this.prisma.speakingSession.update({
          where: { id: speakingSessionId },
          data: {
            partTimestamps: {
              ...timestamps,
              egressId,
              recordingStartedAt: new Date().toISOString(),
            },
          },
        });
      })();
    }, 8000);
  }

  private partTimestamps(value: unknown): PartTimestamps {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return { ...(value as PartTimestamps) };
    }
    return {};
  }

  private async assertAccess(speakingSessionId: string, user: RequestUser) {
    const session = await this.prisma.speakingSession.findUnique({
      where: { id: speakingSessionId },
      include: speakingSessionInclude,
    });

    if (!session) {
      throw new NotFoundException('Speaking session not found');
    }

    this.resolveRole(session, user);
    return session;
  }

  private resolveRole(
    session: {
      teacherId: string | null;
      sectionAttempt: {
        session: {
          enrollment: { studentId: string };
        };
      };
    },
    user: RequestUser,
  ): 'examiner' | 'student' | 'admin' {
    if (user.role === 'ADMIN') return 'admin';

    const studentId =
      session.sectionAttempt.session.enrollment.studentId;

    if (user.studentProfileId && user.studentProfileId === studentId) {
      return 'student';
    }

    if (
      user.teacherProfileId &&
      session.teacherId &&
      user.teacherProfileId === session.teacherId
    ) {
      return 'examiner';
    }

    throw new ForbiddenException('Not authorized for this speaking session');
  }

  private toStateResponse(
    session: {
      id: string;
      status: SpeakingSessionStatus;
      activePhase: string | null;
      examinerReady: boolean;
      scheduledAt: Date | null;
      startedAt: Date | null;
      endedAt: Date | null;
      recordingUrl: string | null;
      partTimestamps: unknown;
      sectionAttempt?: {
        session: {
          sessionCode: string;
          enrollment: {
            student: { user: { name: string } };
          };
        };
      };
      teacher?: { user: { name: string } } | null;
    },
    extras?: {
      examinerName?: string;
      examinerTitle?: string;
      sessionCode?: string;
    },
  ) {
    const studentName =
      session.sectionAttempt?.session.enrollment.student.user.name ?? 'Student';
    const examinerName =
      extras?.examinerName ?? session.teacher?.user.name ?? 'Examiner';
    const partTimestamps = this.partTimestamps(session.partTimestamps);
    const recordingActive = Boolean(
      partTimestamps.egressId && !session.recordingUrl,
    );

    return {
      id: session.id,
      status: session.status.toLowerCase(),
      activePhase: (session.activePhase ?? 'part1') as SpeakingPhase,
      examinerReady: session.examinerReady,
      scheduledAt: session.scheduledAt,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      studentName,
      examinerName,
      examinerTitle: extras?.examinerTitle ?? 'Speaking Examiner · IELTS Certified',
      sessionCode:
        extras?.sessionCode ??
        session.sectionAttempt?.session.sessionCode ??
        null,
      roomName: this.livekit.roomNameForSession(session.id),
      livekitConfigured: this.livekit.isConfigured(),
      recordingEnabled: this.livekit.isRecordingEnabled(),
      recordingActive,
      recordingUrl: session.recordingUrl,
    };
  }
}

