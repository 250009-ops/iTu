import type {
  AnswerMap,
  AnswerValue,
  QuestionGroup,
} from "@/lib/exam/types";
import { gapsInGroup } from "@/lib/admin/content/utils";

/** Enumerate every question number covered by a list of groups, in order. */
export function questionNumbers(groups: QuestionGroup[]): number[] {
  const nums: number[] = [];
  for (const g of groups) {
    nums.push(...gapsInGroup(g));
  }
  return nums;
}

/** True when a question has a non-empty answer recorded. */
export function isAnswered(value: AnswerValue): boolean {
  if (value == null) return false;
  if (Array.isArray(value)) return value.length > 0;
  return value.trim().length > 0;
}

/** Count answered questions within a number range. */
export function answeredCount(answers: AnswerMap, nums: number[]): number {
  return nums.filter((n) => isAnswered(answers[n])).length;
}

export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function formatLongClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}
