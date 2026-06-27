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

export function localTodayIso(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function isValidMockTime(mockTime: string): boolean {
  return /^\d{2}:\d{2}$/.test(mockTime);
}

export function isMockStartInFuture(
  mockDate: string,
  mockTime: string,
  now = new Date(),
): boolean {
  if (!mockDate || !isValidMockTime(mockTime)) return false;
  return mockStartDateTime(mockDate, mockTime).getTime() > now.getTime();
}

/** Earliest allowed HH:mm when mock date is today (local time). */
export function minMockTimeForDate(mockDate: string, now = new Date()): string | undefined {
  if (mockDate !== localTodayIso(now)) return undefined;
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

export function defaultMockTimeForDate(mockDate: string, now = new Date()): string {
  if (mockDate !== localTodayIso(now)) return "09:00";
  const min = minMockTimeForDate(mockDate, now);
  if (!min) return "09:00";
  const [h, m] = min.split(":").map(Number);
  const roundedMin = m < 30 ? 30 : 0;
  const roundedH = m < 30 ? h : Math.min(h + 1, 23);
  return `${String(roundedH).padStart(2, "0")}:${String(roundedMin).padStart(2, "0")}`;
}

export function clampMockTimeForDate(
  mockDate: string,
  mockTime: string,
  now = new Date(),
): string {
  const min = minMockTimeForDate(mockDate, now);
  if (!min || mockTime >= min) return mockTime;
  return defaultMockTimeForDate(mockDate, now);
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
