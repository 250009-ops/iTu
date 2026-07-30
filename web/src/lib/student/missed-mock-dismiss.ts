/** Missed-mock banner may be dismissed once this many calendar days have passed. */
export const MISSED_MOCK_DISMISS_AFTER_DAYS = 3;

const STORAGE_KEY = "ielts_dismissed_missed_mocks";

function readDismissedSet(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(
      parsed.filter((item): item is string => typeof item === "string" && item.length > 0),
    );
  } catch {
    return new Set();
  }
}

function writeDismissedSet(keys: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...keys]));
  } catch {
    // Quota / private mode — dismiss still works for this session via React state.
  }
}

export function isMissedMockDismissed(enrollmentCode: string): boolean {
  const code = enrollmentCode.trim();
  if (!code) return false;
  return readDismissedSet().has(code);
}

export function dismissMissedMock(enrollmentCode: string): void {
  const code = enrollmentCode.trim();
  if (!code) return;
  const next = readDismissedSet();
  next.add(code);
  writeDismissedSet(next);
}
