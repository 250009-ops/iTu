/** Shared mock-day window, cutoff, and lifecycle helpers. */

export const DEFAULT_MOCK_DAY_CUTOFF = '23:59';
export const DEFAULT_PLATFORM_TIMEZONE = 'Asia/Tashkent';
export const DEFAULT_SPEAKING_EARLY_JOIN_MIN = 5;

export type MockDayTimers = {
  dayCutoffTime?: string;
  speakingEarlyJoinMin?: number;
  lateJoin?: number;
};

export function parseTimeParts(time: string): { hours: number; minutes: number } {
  if (!/^\d{2}:\d{2}$/.test(time)) {
    throw new Error(`Invalid time format: ${time}`);
  }
  const [hours, minutes] = time.split(':').map((part) => parseInt(part, 10));
  return { hours, minutes };
}

/** YYYY-MM-DD for a calendar day in the given IANA timezone. */
export function calendarDateIsoInTimeZone(
  date: Date,
  timeZone = DEFAULT_PLATFORM_TIMEZONE,
): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(date);
}

/** Extract YYYY-MM-DD from API input (date-only or ISO string). */
export function extractCalendarDateIso(
  input: Date | string,
  timeZone = DEFAULT_PLATFORM_TIMEZONE,
): string {
  if (typeof input === 'string') {
    const match = input.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1]!;
  }
  const date = typeof input === 'string' ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid mock date: ${String(input)}`);
  }
  return calendarDateIsoInTimeZone(date, timeZone);
}

function getTimezoneOffsetMs(timeZone: string, date: Date): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(
    dtf.formatToParts(date).map((part) => [part.type, part.value]),
  );
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return asUtc - date.getTime();
}

/** Wall-clock time on a calendar day in `timeZone`, returned as a UTC instant. */
export function zonedWallClockToUtc(
  dateIso: string,
  hours: number,
  minutes: number,
  seconds: number,
  timeZone = DEFAULT_PLATFORM_TIMEZONE,
): Date {
  const [year, month, day] = dateIso.split('-').map(Number);
  const utcGuess = Date.UTC(year, month - 1, day, hours, minutes, seconds);
  let result = new Date(utcGuess);
  for (let i = 0; i < 2; i++) {
    const offsetMs = getTimezoneOffsetMs(timeZone, result);
    result = new Date(utcGuess - offsetMs);
  }
  return result;
}

/** Combine a calendar mock date with an HH:mm cutoff on that platform day. */
export function mockDayCutoffDateTime(
  mockDate: Date | string,
  cutoffTime = DEFAULT_MOCK_DAY_CUTOFF,
  timeZone = DEFAULT_PLATFORM_TIMEZONE,
): Date {
  const dateIso = extractCalendarDateIso(mockDate, timeZone);
  const { hours, minutes } = parseTimeParts(cutoffTime);
  return zonedWallClockToUtc(dateIso, hours, minutes, 59, timeZone);
}

/** Validate grant/reappoint cutoff; returns stored cutoff instant. */
export function resolveMockDayCutoffAt(
  mockDate: Date | string,
  cutoffTime: string,
  timeZone = DEFAULT_PLATFORM_TIMEZONE,
  now = new Date(),
): Date {
  const dateIso = extractCalendarDateIso(mockDate, timeZone);
  const todayIso = calendarDateIsoInTimeZone(now, timeZone);
  const mockDayCutoffAt = mockDayCutoffDateTime(mockDate, cutoffTime, timeZone);

  if (dateIso < todayIso) {
    throw new Error('Mock day must be today or in the future');
  }
  if (dateIso === todayIso && mockDayCutoffAt.getTime() <= now.getTime()) {
    throw new Error(
      `Mock day cutoff (${cutoffTime} ${timeZone}) has already passed for today`,
    );
  }
  return mockDayCutoffAt;
}

export function isSameCalendarDayInTimeZone(
  a: Date,
  b: Date,
  timeZone = DEFAULT_PLATFORM_TIMEZONE,
): boolean {
  return (
    calendarDateIsoInTimeZone(a, timeZone) === calendarDateIsoInTimeZone(b, timeZone)
  );
}

export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function isSameLocalDay(a: Date, b: Date): boolean {
  return startOfLocalDay(a).getTime() === startOfLocalDay(b).getTime();
}

export function isFlexibleGrant(enrollment: {
  adminGranted: boolean;
  mockTime: string | null;
}): boolean {
  return enrollment.adminGranted && enrollment.mockTime == null;
}

export function hasExamStarted(input: {
  examStartedAt?: Date | null;
  checkInAt?: Date | null;
  sectionAttempts?: { startedAt: Date | null }[];
}): boolean {
  if (input.examStartedAt) return true;
  if (input.checkInAt) return true;
  return input.sectionAttempts?.some((a) => a.startedAt != null) ?? false;
}

export function shouldMarkMissed(
  enrollment: {
    status: string;
    mockDayCutoffAt: Date | null;
    examStartedAt: Date | null;
  },
  session: {
    checkInAt: Date | null;
    sectionAttempts: { startedAt: Date | null }[];
  } | null,
  now = new Date(),
): boolean {
  if (enrollment.status !== 'ENROLLED') return false;
  if (enrollment.examStartedAt) return false;
  if (hasExamStarted({ checkInAt: session?.checkInAt ?? null, sectionAttempts: session?.sectionAttempts })) {
    return false;
  }
  const cutoff = enrollment.mockDayCutoffAt;
  if (!cutoff) return false;
  return now.getTime() > cutoff.getTime();
}

export function canStartMockOnDay(
  enrollment: {
    mockDate: Date;
    mockDayCutoffAt: Date | null;
    adminGranted: boolean;
    mockTime: string | null;
    status: string;
    examStartedAt: Date | null;
  },
  now = new Date(),
): { allowed: boolean; reason?: string } {
  if (enrollment.status === 'MISSED') {
    return { allowed: false, reason: 'This mock was missed. Ask an admin to reappoint it.' };
  }
  if (enrollment.status !== 'ENROLLED' && enrollment.status !== 'IN_PROGRESS') {
    return { allowed: false, reason: 'This mock is no longer available to start.' };
  }
  if (enrollment.examStartedAt) {
    return { allowed: true };
  }
  if (!isSameCalendarDayInTimeZone(enrollment.mockDate, now)) {
    return {
      allowed: false,
      reason: isFlexibleGrant(enrollment)
        ? 'You can only start this mock on your assigned mock day.'
        : 'Check-in opens on your scheduled mock day.',
    };
  }
  const cutoff = enrollment.mockDayCutoffAt;
  if (cutoff && now.getTime() > cutoff.getTime()) {
    return {
      allowed: false,
      reason: 'The mock day window has closed. Contact support to reappoint.',
    };
  }
  if (!isFlexibleGrant(enrollment) && enrollment.mockTime) {
    const [hours, minutes] = enrollment.mockTime.split(':').map(Number);
    const start = new Date(enrollment.mockDate);
    start.setHours(hours, minutes, 0, 0);
    const checkInOpens = new Date(start.getTime() - 30 * 60_000);
    if (now.getTime() < checkInOpens.getTime()) {
      return {
        allowed: false,
        reason: `Check-in opens at ${enrollment.mockTime}.`,
      };
    }
  }
  return { allowed: true };
}

export function speakingJoinWindow(
  scheduledAt: Date | null | undefined,
  options: {
    earlyJoinMin?: number;
    durationMin?: number;
    lateJoinMin?: number;
    now?: Date;
  } = {},
): {
  allowed: boolean;
  tooEarly: boolean;
  tooLate: boolean;
  opensAt: Date | null;
  closesAt: Date | null;
  message: string | null;
} {
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
  const earlyJoinMin = options.earlyJoinMin ?? DEFAULT_SPEAKING_EARLY_JOIN_MIN;
  const durationMin = options.durationMin ?? 20;
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
      message: 'The late-join window for this speaking slot has closed.',
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
