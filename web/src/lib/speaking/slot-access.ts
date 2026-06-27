export const SPEAKING_EARLY_JOIN_MINUTES = 5;
export const SPEAKING_SLOT_DURATION_MINUTES = 20;

export type SpeakingJoinAccess = {
  allowed: boolean;
  tooEarly: boolean;
  tooLate: boolean;
  opensAt: Date | null;
  closesAt: Date | null;
  message: string | null;
};

export function speakingJoinAccess(
  _scheduledAt: string | Date | null | undefined,
  _durationMin = SPEAKING_SLOT_DURATION_MINUTES,
): SpeakingJoinAccess {
  // Time-based join windows have been removed. Examiner readiness (not the
  // clock) governs when a candidate can join, so early arrivals and
  // late-running schedules no longer lock anyone out of the speaking exam.
  return {
    allowed: true,
    tooEarly: false,
    tooLate: false,
    opensAt: null,
    closesAt: null,
    message: null,
  };
}

export function formatJoinOpensAt(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}
