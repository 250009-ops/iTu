import { shouldMarkSpeakingNoShow } from './mock-day-policy';
import { SPEAKING_SLOT_DURATION_MINUTES } from './speaking-slot-grid';

export type SpeakingSessionUiStatus =
  | 'upcoming'
  | 'live'
  | 'awaiting_grade'
  | 'graded'
  | 'no_show'
  | 'cancelled';

export type SpeakingSessionUiInput = {
  status: string;
  scheduledAt: Date | null;
  startedAt?: Date | null;
  /** Truthy when a grade row exists (any shape). */
  grade?: unknown | null;
};

/**
 * Canonical teacher/examiner UI status for a speaking session.
 * Past SCHEDULED slots that missed the late-join window surface as no_show
 * even before the lifecycle cron persists NO_SHOW.
 */
export function resolveSpeakingSessionUiStatus(
  session: SpeakingSessionUiInput,
  now = new Date(),
  options: { durationMin?: number; lateJoinMin?: number } = {},
): SpeakingSessionUiStatus {
  if (session.grade) return 'graded';

  const status = session.status.toUpperCase();
  if (status === 'NO_SHOW') return 'no_show';
  if (status === 'COMPLETED') return 'awaiting_grade';
  if (status === 'CANCELLED') return 'cancelled';
  if (status === 'ACTIVE' || status === 'WAITING') return 'live';

  const lateJoinMin = options.lateJoinMin ?? 15;
  if (
    shouldMarkSpeakingNoShow(
      {
        status,
        startedAt: session.startedAt ?? null,
        scheduledAt: session.scheduledAt,
      },
      lateJoinMin,
      now,
    )
  ) {
    return 'no_show';
  }

  const durationMin = options.durationMin ?? SPEAKING_SLOT_DURATION_MINUTES;
  if (session.scheduledAt) {
    const start = session.scheduledAt.getTime();
    const end = start + durationMin * 60_000;
    const t = now.getTime();
    if (t >= start && t < end) return 'live';
  }

  return 'upcoming';
}

export function speakingSessionEndsAt(
  scheduledAt: Date | null,
  durationMin = SPEAKING_SLOT_DURATION_MINUTES,
): Date | null {
  if (!scheduledAt) return null;
  return new Date(scheduledAt.getTime() + durationMin * 60_000);
}

export function isActionableSpeakingUiStatus(
  uiStatus: SpeakingSessionUiStatus,
): boolean {
  return uiStatus === 'upcoming' || uiStatus === 'live';
}
