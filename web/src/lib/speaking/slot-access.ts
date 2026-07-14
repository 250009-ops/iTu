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
  options: {
    earlyJoinMin?: number;
    lateJoinMin?: number;
    now?: Date;
  } = {},
): SpeakingJoinAccess {
  if (!scheduledAt) {
    return {
      allowed: false,
      tooEarly: false,
      tooLate: false,
      opensAt: null,
      closesAt: null,
      message: 'Select a speaking time first.',
    };
  }

  const now = options.now ?? new Date();
  const earlyJoinMin = options.earlyJoinMin ?? SPEAKING_EARLY_JOIN_MINUTES;
  const lateJoinMin = options.lateJoinMin ?? 15;
  const start = new Date(scheduledAt);
  const opensAt = new Date(start.getTime() - earlyJoinMin * 60_000);
  const closesAt = new Date(start.getTime() + lateJoinMin * 60_000);
  const end = new Date(start.getTime() + durationMin * 60_000);

  if (now.getTime() < opensAt.getTime()) {
    return {
      allowed: false,
      tooEarly: true,
      tooLate: false,
      opensAt,
      closesAt: end,
      message: null,
    };
  }
  if (now.getTime() > closesAt.getTime()) {
    return {
      allowed: false,
      tooEarly: false,
      tooLate: true,
      opensAt,
      closesAt: end,
      message: 'The late-join window for this speaking slot has closed. You have been marked absent.',
    };
  }
  return {
    allowed: true,
    tooEarly: false,
    tooLate: false,
    opensAt,
    closesAt: end,
    message: null,
  };
}

export function formatJoinOpensAt(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}
