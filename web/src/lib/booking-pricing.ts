/** Mirrors api/src/common/booking-pricing.ts for student UI totals. */
export const AUTO_SCORED_FEE_UZS = 16_000;

export type BookingSkill = "listening" | "reading" | "writing" | "speaking";

export function packageIsExaminerPriced(skills: unknown): boolean {
  if (!Array.isArray(skills)) return false;
  for (const entry of skills) {
    const raw =
      typeof entry === "string"
        ? entry
        : entry && typeof entry === "object" && "id" in entry
          ? String((entry as { id: unknown }).id)
          : "";
    const id = raw.toLowerCase();
    if (id === "writing" || id === "speaking") return true;
  }
  return false;
}

export function computeStudentBookingTotal(input: {
  skillIds: string[];
  /** Used for Listening/Reading-only packages. */
  packagePrice?: number | null;
  writingRate?: number | null;
  speakingRate?: number | null;
}): {
  amount: number;
  complete: boolean;
  missing: Array<"writing" | "speaking">;
  breakdown: {
    listening: number;
    reading: number;
    writing: number;
    speaking: number;
  };
} {
  const skills = new Set(input.skillIds.map((s) => s.toLowerCase()));
  const missing: Array<"writing" | "speaking"> = [];
  const examinerPriced = skills.has("writing") || skills.has("speaking");

  if (!examinerPriced) {
    const amount =
      input.packagePrice != null && Number.isFinite(input.packagePrice)
        ? Math.max(0, Math.round(input.packagePrice))
        : (skills.has("listening") ? AUTO_SCORED_FEE_UZS : 0) +
          (skills.has("reading") ? AUTO_SCORED_FEE_UZS : 0);
    const breakdown = {
      listening: 0,
      reading: 0,
      writing: 0,
      speaking: 0,
    };
    if (skills.size === 1 && skills.has("listening")) {
      breakdown.listening = amount;
    } else if (skills.size === 1 && skills.has("reading")) {
      breakdown.reading = amount;
    } else {
      breakdown.listening = skills.has("listening") ? AUTO_SCORED_FEE_UZS : 0;
      breakdown.reading = skills.has("reading") ? AUTO_SCORED_FEE_UZS : 0;
    }
    return { amount, complete: true, missing: [], breakdown };
  }

  const breakdown = {
    listening: skills.has("listening") ? AUTO_SCORED_FEE_UZS : 0,
    reading: skills.has("reading") ? AUTO_SCORED_FEE_UZS : 0,
    writing: 0,
    speaking: 0,
  };

  if (skills.has("writing")) {
    const rate = input.writingRate;
    if (rate == null || !Number.isFinite(rate) || rate <= 0) missing.push("writing");
    else breakdown.writing = Math.round(rate);
  }
  if (skills.has("speaking")) {
    const rate = input.speakingRate;
    if (rate == null || !Number.isFinite(rate) || rate <= 0) missing.push("speaking");
    else breakdown.speaking = Math.round(rate);
  }

  const complete = missing.length === 0;
  const amount = complete
    ? breakdown.listening +
      breakdown.reading +
      breakdown.writing +
      breakdown.speaking
    : 0;

  return { amount, complete, missing, breakdown };
}
