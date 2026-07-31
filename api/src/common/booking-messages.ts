import { BadRequestException } from '@nestjs/common';
import {
  calendarDateIsoInTimeZone,
  DEFAULT_PLATFORM_TIMEZONE,
  extractCalendarDateIso,
  parseTimeParts,
  zonedWallClockToUtc,
} from './mock-day-policy';
import { wallClockHhMmInTimeZone } from './speaking-slot-grid';

/** Mock start as a real instant in the platform timezone (not server-local setHours). */
export function mockStartDateTimeInTimeZone(
  mockDate: Date | string,
  mockTime: string,
  timeZone = DEFAULT_PLATFORM_TIMEZONE,
): Date {
  const dateIso = extractCalendarDateIso(mockDate, timeZone);
  const { hours, minutes } = parseTimeParts(mockTime);
  return zonedWallClockToUtc(dateIso, hours, minutes, 0, timeZone);
}

export function assertSpeakingSlotMatchesMockDay(
  speakingStartsAt: Date,
  mockDate: Date | string,
  timeZone = DEFAULT_PLATFORM_TIMEZONE,
): void {
  const slotDateIso = calendarDateIsoInTimeZone(speakingStartsAt, timeZone);
  const mockDateIso = extractCalendarDateIso(mockDate, timeZone);
  if (slotDateIso !== mockDateIso) {
    throw new BadRequestException(
      'Speaking slot must be on the same day as your mock date',
    );
  }
}

export function formatPlatformDateLabel(
  value: Date | string,
  timeZone = DEFAULT_PLATFORM_TIMEZONE,
): string {
  const dateIso = extractCalendarDateIso(value, timeZone);
  const noon = zonedWallClockToUtc(dateIso, 12, 0, 0, timeZone);
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(noon);
}

export function formatPlatformTimeLabel(
  value: Date | string,
  timeZone = DEFAULT_PLATFORM_TIMEZONE,
): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return wallClockHhMmInTimeZone(date, timeZone);
}

export function formatPlatformDateTimeLabel(
  value: Date | string,
  timeZone = DEFAULT_PLATFORM_TIMEZONE,
): string {
  return `${formatPlatformDateLabel(value, timeZone)} at ${formatPlatformTimeLabel(value, timeZone)}`;
}

export function formatMockDayLabel(
  mockDate: Date | string,
  mockTime: string | null | undefined,
  timeZone = DEFAULT_PLATFORM_TIMEZONE,
): string {
  if (mockTime && /^\d{2}:\d{2}$/.test(mockTime)) {
    const start = mockStartDateTimeInTimeZone(mockDate, mockTime, timeZone);
    return formatPlatformDateTimeLabel(start, timeZone);
  }
  const dateIso = extractCalendarDateIso(mockDate, timeZone);
  const noon = zonedWallClockToUtc(dateIso, 12, 0, 0, timeZone);
  return formatPlatformDateLabel(noon, timeZone);
}

export type StudentBookingConfirmInput = {
  skills: string[];
  mockDate: Date | string;
  mockTime?: string | null;
  speakingStartsAt?: Date | null;
  timeZone?: string;
};

/** In-app + email copy after a student booking is confirmed. */
export function studentBookingConfirmationMessage(
  input: StudentBookingConfirmInput,
): { title: string; body: string } {
  const timeZone = input.timeZone ?? DEFAULT_PLATFORM_TIMEZONE;
  const skills = input.skills.map((s) => s.toLowerCase());
  const speakingOnly = skills.length === 1 && skills[0] === 'speaking';
  const hasSpeaking = skills.includes('speaking');
  const hasOtherSkills = skills.some((s) => s !== 'speaking');

  if (speakingOnly && input.speakingStartsAt) {
    return {
      title: 'Speaking booked',
      body: `Your Speaking session is confirmed for ${formatPlatformDateTimeLabel(input.speakingStartsAt, timeZone)}.`,
    };
  }

  const mockLabel = formatMockDayLabel(input.mockDate, input.mockTime, timeZone);

  if (hasSpeaking && hasOtherSkills && input.speakingStartsAt) {
    return {
      title: 'Mock booked',
      body: `Your mock is confirmed for ${mockLabel}. Speaking is at ${formatPlatformTimeLabel(input.speakingStartsAt, timeZone)} the same day.`,
    };
  }

  if (hasSpeaking && input.speakingStartsAt) {
    return {
      title: 'Mock booked',
      body: `Your mock is confirmed for ${formatPlatformDateTimeLabel(input.speakingStartsAt, timeZone)}.`,
    };
  }

  return {
    title: 'Mock booked',
    body: `Your mock is confirmed for ${mockLabel}.`,
  };
}

export function studentRescheduleConfirmationMessage(
  input: StudentBookingConfirmInput,
): { title: string; body: string } {
  const confirmed = studentBookingConfirmationMessage(input);
  return {
    title: confirmed.title.replace('booked', 'rescheduled').replace('Booked', 'Rescheduled'),
    body: confirmed.body
      .replace('is confirmed for', 'is now scheduled for')
      .replace('are confirmed for', 'are now scheduled for'),
  };
}
