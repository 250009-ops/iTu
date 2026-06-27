/** Combine API mock date + HH:mm check-in time into a local start Date. */
export function mockStartDateTime(mockDate: string | Date, mockTime: string): Date {
  const start = new Date(mockDate);
  const [hours, minutes] = mockTime.split(":").map((part) => parseInt(part, 10));
  start.setHours(
    Number.isFinite(hours) ? hours : 0,
    Number.isFinite(minutes) ? minutes : 0,
    0,
    0,
  );
  return start;
}

export function secondsUntil(date: Date, now = Date.now()): number {
  const targetMs = date.getTime();
  if (!Number.isFinite(targetMs)) return 0;
  return Math.max(0, Math.floor((targetMs - now) / 1000));
}

export function splitCountdown(totalSeconds: number) {
  const safe = Number.isFinite(totalSeconds) ? Math.max(0, Math.floor(totalSeconds)) : 0;
  return {
    hours: Math.floor(safe / 3600),
    minutes: Math.floor((safe % 3600) / 60),
    seconds: safe % 60,
  };
}
