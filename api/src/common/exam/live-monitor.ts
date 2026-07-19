import { Prisma } from '@prisma/client';
import {
  SECTION_DURATIONS_SEC,
  skillForActiveState,
} from '../../modules/exam-sessions/exam-state-machine';

export const INTEGRITY_FLAG_EVENTS = new Set([
  'tab_switch',
  'paste_attempt',
  'fullscreen_exit',
  'audio_seek_attempt',
]);

export const ACTIVE_EXAM_STATES = [
  'LISTENING_ACTIVE',
  'READING_ACTIVE',
  'WRITING_ACTIVE',
  'SPEAKING_ACTIVE',
] as const;

export function formatTimeLeft(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const liveSessionInclude = {
  enrollment: {
    include: {
      student: { include: { user: true } },
      speakingTeacher: { include: { user: true } },
    },
  },
  sectionAttempts: true,
} satisfies Prisma.ExamSessionInclude;

export type LiveSessionRecord = Prisma.ExamSessionGetPayload<{
  include: typeof liveSessionInclude;
}>;

export { liveSessionInclude };

export function mapLiveSessionRows(sessions: LiveSessionRecord[]) {
  return sessions.map((s) => {
    const activeSkill = skillForActiveState(s.state);
    const skill = activeSkill?.toLowerCase() ?? 'listening';
    const attempt = activeSkill
      ? s.sectionAttempts.find((a) => a.skill === activeSkill)
      : undefined;
    const duration = activeSkill ? SECTION_DURATIONS_SEC[activeSkill] : 0;
    let remainingSec = 0;
    if (s.suspendedAt && attempt?.timeRemaining != null) {
      remainingSec = attempt.timeRemaining;
    } else if (attempt?.startedAt && !attempt.submittedAt && duration > 0) {
      const elapsed = Math.floor(
        (Date.now() - attempt.startedAt.getTime()) / 1000,
      );
      remainingSec = Math.max(0, duration - elapsed);
    }
    const progress =
      duration > 0
        ? Math.round(((duration - remainingSec) / duration) * 100)
        : 0;
    const log = (s.integrityLog as { event?: string }[]) ?? [];
    const flags = log.filter((entry) =>
      INTEGRITY_FLAG_EVENTS.has(entry.event ?? ''),
    ).length;

    return {
      sessionCode: s.sessionCode,
      studentName: s.enrollment.student.user.name,
      country: s.enrollment.student.country ?? '—',
      skill,
      progress,
      timeLeft: formatTimeLeft(remainingSec),
      remainingSec,
      examiner: s.enrollment.speakingTeacher?.user.name,
      integrity: s.integrity.toLowerCase(),
      flags,
      suspended: Boolean(s.suspendedAt),
      suspendReason: s.suspendReason,
      suspendedAt: s.suspendedAt?.toISOString() ?? null,
    };
  });
}
