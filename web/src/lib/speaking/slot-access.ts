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
  scheduledAt: string | Date | null | undefined,
  durationMin = SPEAKING_SLOT_DURATION_MINUTES,
): SpeakingJoinAccess {
  if (!scheduledAt) {
    return {
      allowed: true,
      tooEarly: false,
      tooLate: false,
      opensAt: null,
      closesAt: null,
      message: null,
    };
  }

  const start = new Date(scheduledAt);
  if (Number.isNaN(start.getTime())) {
    return {
      allowed: true,
      tooEarly: false,
      tooLate: false,
      opensAt: null,
      closesAt: null,
      message: null,
    };
  }

  const opensAt = new Date(
    start.getTime() - SPEAKING_EARLY_JOIN_MINUTES * 60 * 1000,
  );
  const closesAt = new Date(start.getTime() + durationMin * 60 * 1000);
  const now = Date.now();

  if (now < opensAt.getTime()) {
    return {
      allowed: false,
      tooEarly: true,
      tooLate: false,
      opensAt,
      closesAt,
      message: `Your speaking slot opens ${SPEAKING_EARLY_JOIN_MINUTES} minutes before the scheduled time.`,
    };
  }

  if (now > closesAt.getTime()) {
    return {
      allowed: false,
      tooEarly: false,
      tooLate: true,
      opensAt,
      closesAt,
      message: "This speaking slot window has ended.",
    };
  }

  return {
    allowed: true,
    tooEarly: false,
    tooLate: false,
    opensAt,
    closesAt,
    message: null,
  };
}

export function formatJoinOpensAt(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}
