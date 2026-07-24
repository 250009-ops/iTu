import {
  clampMockTimeForDate,
  isMockStartInFuture,
  isValidMockTime,
} from "@/lib/student/datetime";

/** Quick-pick exam start times shown in booking / reschedule flows. */
export const EXAM_START_TIMES = ["08:30", "09:00", "09:30", "10:00", "13:00"] as const;

export function defaultExamStartTime(mockDate: string): string {
  return clampMockTimeForDate(mockDate, EXAM_START_TIMES[1] ?? "09:00");
}

/** Normalize `<input type="time">` value to HH:mm (empty stays empty). */
export function normalizeMockTimeInput(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.slice(0, 5);
}

export function getMockTimeValidationError(
  mockDate: string,
  mockTime: string,
  now = new Date(),
): string | null {
  if (!mockDate) return "Pick a mock date.";
  if (!mockTime) return "Choose or enter an exam start time.";
  if (!isValidMockTime(mockTime)) return "Enter a valid time (HH:mm).";
  if (!isMockStartInFuture(mockDate, mockTime, now)) {
    return "Start time must be in the future.";
  }
  return null;
}

export function isMockTimeSelectionValid(
  mockDate: string,
  mockTime: string,
  now = new Date(),
): boolean {
  return getMockTimeValidationError(mockDate, mockTime, now) === null;
}
