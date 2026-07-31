/**
 * Canonical speaking session grid: 20-minute slots on :00 / :20 / :40 only.
 * Display uses the platform timezone so UTC storage never shifts wall-clock labels.
 */

export const SPEAKING_SLOT_DURATION_MINUTES = 20;
export const SPEAKING_SLOT_GRID_MINUTES = [0, 20, 40] as const;
export const PLATFORM_DISPLAY_TIMEZONE = "Asia/Tashkent";

export type SpeakingGridMinute = (typeof SPEAKING_SLOT_GRID_MINUTES)[number];

export type SpeakingSlotLike = {
  id: string;
  startsAt: string;
  endsAt?: string;
  status?: string;
};

export function isSpeakingGridMinute(
  minute: number,
): minute is SpeakingGridMinute {
  return minute === 0 || minute === 20 || minute === 40;
}

export function isSpeakingGridTime(time: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(time)) return false;
  const [hours, minutes] = time.split(":").map(Number);
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

export function ceilSpeakingGridTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const hours = h ?? 0;
  const minutes = m ?? 0;
  if (isSpeakingGridMinute(minutes)) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }
  if (minutes < 20) {
    return `${String(hours).padStart(2, "0")}:20`;
  }
  if (minutes < 40) {
    return `${String(hours).padStart(2, "0")}:40`;
  }
  const nextHour = hours + 1;
  if (nextHour > 23) return "23:40";
  return `${String(nextHour).padStart(2, "0")}:00`;
}

export function floorSpeakingGridTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const hours = h ?? 0;
  const minutes = m ?? 0;
  if (isSpeakingGridMinute(minutes)) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }
  if (minutes > 40) {
    return `${String(hours).padStart(2, "0")}:40`;
  }
  if (minutes > 20) {
    return `${String(hours).padStart(2, "0")}:20`;
  }
  return `${String(hours).padStart(2, "0")}:00`;
}

/** All on-grid HH:mm values in a day (00:00 … 23:40). */
export function allSpeakingGridTimes(): string[] {
  const out: string[] = [];
  for (let hour = 0; hour < 24; hour += 1) {
    for (const minute of SPEAKING_SLOT_GRID_MINUTES) {
      out.push(
        `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
      );
    }
  }
  return out;
}

export function speakingWallParts(
  iso: string | Date,
  timeZone = PLATFORM_DISPLAY_TIMEZONE,
): { hour: number; minute: number; hhMm: string } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
      .formatToParts(new Date(iso))
      .map((part) => [part.type, part.value]),
  );
  let hour = Number(parts.hour);
  const minute = Number(parts.minute);
  if (hour === 24) hour = 0;
  const hhMm = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  return { hour, minute, hhMm };
}

/** Format a stored UTC instant as platform wall-clock HH:mm. */
export function formatSpeakingWallTime(
  iso: string | Date,
  timeZone = PLATFORM_DISPLAY_TIMEZONE,
): string {
  return speakingWallParts(iso, timeZone).hhMm;
}

/** YYYY-MM-DD of a speaking instant in the platform timezone. */
export function speakingCalendarDateIso(
  iso: string | Date,
  timeZone = PLATFORM_DISPLAY_TIMEZONE,
): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date(iso));
}

export function isSpeakingGridInstant(
  iso: string | Date,
  timeZone = PLATFORM_DISPLAY_TIMEZONE,
): boolean {
  return isSpeakingGridTime(speakingWallParts(iso, timeZone).hhMm);
}

/** Keep only available, on-grid slots (hide legacy off-grid from new bookings). */
export function filterBookableSpeakingSlots<T extends SpeakingSlotLike>(
  slots: T[],
  timeZone = PLATFORM_DISPLAY_TIMEZONE,
): T[] {
  return slots.filter((slot) => {
    if (slot.status && slot.status !== "available") return false;
    return isSpeakingGridInstant(slot.startsAt, timeZone);
  });
}

export function groupSpeakingSlotsByHour<T extends SpeakingSlotLike>(
  slots: T[],
  timeZone = PLATFORM_DISPLAY_TIMEZONE,
): { hour: number; hourLabel: string; slots: T[] }[] {
  const byHour = new Map<number, T[]>();
  for (const slot of filterBookableSpeakingSlots(slots, timeZone)) {
    const { hour } = speakingWallParts(slot.startsAt, timeZone);
    const list = byHour.get(hour) ?? [];
    list.push(slot);
    byHour.set(hour, list);
  }
  return [...byHour.entries()]
    .sort(([a], [b]) => a - b)
    .map(([hour, hourSlots]) => ({
      hour,
      hourLabel: `${String(hour).padStart(2, "0")}:00`,
      slots: hourSlots.sort(
        (a, b) =>
          new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
      ),
    }));
}

export function formatSpeakingTimeRange(
  scheduledAt: string | Date | null | undefined,
  endsAt?: string | Date | null,
  timeZone = PLATFORM_DISPLAY_TIMEZONE,
): string {
  if (!scheduledAt) return "TBD";
  const start = formatSpeakingWallTime(scheduledAt, timeZone);
  const end = endsAt
    ? formatSpeakingWallTime(endsAt, timeZone)
    : formatSpeakingWallTime(
        new Date(
          new Date(scheduledAt).getTime() +
            SPEAKING_SLOT_DURATION_MINUTES * 60_000,
        ),
        timeZone,
      );
  return `${start} – ${end}`;
}
