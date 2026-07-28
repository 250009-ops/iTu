/**
 * Canonical speaking session grid: 20-minute slots on :00 / :20 / :40 only.
 * Legacy off-grid rows may remain in the DB; new generation/booking must not.
 */

import { BadRequestException } from '@nestjs/common';
import {
  calendarDateIsoInTimeZone,
  DEFAULT_PLATFORM_TIMEZONE,
} from './mock-day-policy';

export const SPEAKING_SLOT_DURATION_MINUTES = 20;
export const SPEAKING_SLOT_GRID_MINUTES = [0, 20, 40] as const;

export type SpeakingGridMinute = (typeof SPEAKING_SLOT_GRID_MINUTES)[number];

export function isSpeakingGridMinute(minute: number): minute is SpeakingGridMinute {
  return (
    minute === 0 || minute === 20 || minute === 40
  );
}

/** HH:mm is on the :00 / :20 / :40 grid. */
export function isSpeakingGridTime(time: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(time)) return false;
  const [hours, minutes] = time.split(':').map(Number);
  if (
    hours == null ||
    minutes == null ||
    Number.isNaN(hours) ||
    Number.isNaN(minutes)
  ) {
    return false;
  }
  if (hours < 0 || hours > 23) return false;
  return isSpeakingGridMinute(minutes);
}

export function assertSpeakingGridTime(time: string, label = 'Speaking time'): void {
  if (!isSpeakingGridTime(time)) {
    throw new BadRequestException(
      `${label} must be on the 20-minute grid (:00, :20, or :40)`,
    );
  }
}

/** Snap HH:mm up to the next grid start (inclusive if already on-grid). */
export function ceilSpeakingGridTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const hours = h ?? 0;
  const minutes = m ?? 0;
  if (isSpeakingGridMinute(minutes)) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }
  if (minutes < 20) {
    return `${String(hours).padStart(2, '0')}:20`;
  }
  if (minutes < 40) {
    return `${String(hours).padStart(2, '0')}:40`;
  }
  const nextHour = hours + 1;
  if (nextHour > 23) return '23:40';
  return `${String(nextHour).padStart(2, '0')}:00`;
}

/** Snap HH:mm down to the previous grid boundary (inclusive if already on-grid). */
export function floorSpeakingGridTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const hours = h ?? 0;
  const minutes = m ?? 0;
  if (isSpeakingGridMinute(minutes)) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }
  if (minutes > 40) {
    return `${String(hours).padStart(2, '0')}:40`;
  }
  if (minutes > 20) {
    return `${String(hours).padStart(2, '0')}:20`;
  }
  return `${String(hours).padStart(2, '0')}:00`;
}

export function minutesFromHhMm(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function hhMmFromMinutes(total: number): string {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Wall-clock HH:mm of an instant in the platform timezone.
 * Used to decide whether a stored UTC instant sits on the speaking grid.
 */
export function wallClockHhMmInTimeZone(
  date: Date,
  timeZone = DEFAULT_PLATFORM_TIMEZONE,
): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  let hour = Number(parts.hour);
  const minute = Number(parts.minute);
  // Some engines emit "24" for midnight.
  if (hour === 24) hour = 0;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function isSpeakingGridInstant(
  date: Date,
  timeZone = DEFAULT_PLATFORM_TIMEZONE,
): boolean {
  return isSpeakingGridTime(wallClockHhMmInTimeZone(date, timeZone));
}

export function assertSpeakingGridInstant(
  date: Date,
  timeZone = DEFAULT_PLATFORM_TIMEZONE,
  label = 'Speaking slot',
): void {
  if (!isSpeakingGridInstant(date, timeZone)) {
    throw new BadRequestException(
      `${label} must start on the 20-minute grid (:00, :20, or :40 ${timeZone})`,
    );
  }
}

/** Calendar date (YYYY-MM-DD) of an instant in platform TZ — re-export helper name. */
export function speakingCalendarDateIso(
  date: Date,
  timeZone = DEFAULT_PLATFORM_TIMEZONE,
): string {
  return calendarDateIsoInTimeZone(date, timeZone);
}
