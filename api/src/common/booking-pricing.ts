/**
 * Student checkout pricing from selected examiners' approved gross rates.
 *
 * Formula (paid B2C bookings):
 * - Listening / Reading only: fixed `packagePrice` (falls back to catalog skill fees)
 * - Writing: selected writing examiner's approved gross rate
 * - Speaking: selected speaking examiner's approved gross rate
 * - Full (L+R+W+S): listening fee + reading fee + writing gross + speaking gross
 *   (L/R are fixed platform components; W/S follow examiners)
 *
 * Platform share % is an examiner payout cut after grading — not a student discount.
 * Complimentary / institution / promo / reappointment flows stay amount = 0.
 */
import {
  CATALOG_CURRENCY,
  UZS_PRICE_BY_PACKAGE_KIND,
} from './catalog-pricing';
import { DEFAULT_BAND_TIERS } from './examiner-rate-tiers';

export type BookingSkill = 'listening' | 'reading' | 'writing' | 'speaking';

export type BookingPriceBreakdown = {
  listening: number;
  reading: number;
  writing: number;
  speaking: number;
};

export type BookingPriceResult = {
  amount: number;
  currency: typeof CATALOG_CURRENCY;
  complete: boolean;
  /** True when writing and/or speaking examiner rates affect the total. */
  examinerPriced: boolean;
  missing: Array<'writing' | 'speaking'>;
  breakdown: BookingPriceBreakdown;
};

export function normalizeBookingSkills(skills: unknown): BookingSkill[] {
  if (!Array.isArray(skills)) return [];
  const out: BookingSkill[] = [];
  const seen = new Set<string>();
  for (const entry of skills) {
    const raw =
      typeof entry === 'string'
        ? entry
        : entry && typeof entry === 'object' && 'id' in entry
          ? String((entry as { id: unknown }).id)
          : '';
    const id = raw.toLowerCase();
    if (
      (id === 'listening' ||
        id === 'reading' ||
        id === 'writing' ||
        id === 'speaking') &&
      !seen.has(id)
    ) {
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

export function packageIsExaminerPriced(skills: unknown): boolean {
  const ids = normalizeBookingSkills(skills);
  return ids.includes('writing') || ids.includes('speaking');
}

export function autoScoredSkillFee(skill: 'listening' | 'reading'): number {
  return UZS_PRICE_BY_PACKAGE_KIND[skill] ?? 8_000;
}

/** Fallback when no approved examiners exist yet (catalog "from" price). */
export function defaultGrossRate(skill: 'writing' | 'speaking'): number {
  return DEFAULT_BAND_TIERS['7.5'][skill].defaultRate;
}

/**
 * Compute the student charge for a package given selected examiner gross rates.
 * Incomplete when a required examiner rate is missing — amount is 0 until complete.
 */
export function computeBookingPrice(input: {
  skills: unknown;
  /** Used for Listening/Reading-only packages (no examiners). */
  packagePrice?: number | null;
  writingGross?: number | null;
  speakingGross?: number | null;
}): BookingPriceResult {
  const skills = normalizeBookingSkills(input.skills);
  const missing: Array<'writing' | 'speaking'> = [];
  const breakdown: BookingPriceBreakdown = {
    listening: 0,
    reading: 0,
    writing: 0,
    speaking: 0,
  };

  const examinerPriced =
    skills.includes('writing') || skills.includes('speaking');

  if (!examinerPriced) {
    const fromPackage =
      input.packagePrice != null && Number.isFinite(input.packagePrice)
        ? Math.max(0, Math.round(input.packagePrice))
        : null;
    const listeningFee = skills.includes('listening')
      ? autoScoredSkillFee('listening')
      : 0;
    const readingFee = skills.includes('reading')
      ? autoScoredSkillFee('reading')
      : 0;
    const amount = fromPackage ?? listeningFee + readingFee;

    if (skills.length === 1 && skills[0] === 'listening') {
      breakdown.listening = amount;
    } else if (skills.length === 1 && skills[0] === 'reading') {
      breakdown.reading = amount;
    } else {
      breakdown.listening = listeningFee;
      breakdown.reading = readingFee;
    }

    return {
      amount,
      currency: CATALOG_CURRENCY,
      complete: true,
      examinerPriced: false,
      missing: [],
      breakdown,
    };
  }

  if (skills.includes('listening')) {
    breakdown.listening = autoScoredSkillFee('listening');
  }
  if (skills.includes('reading')) {
    breakdown.reading = autoScoredSkillFee('reading');
  }
  if (skills.includes('writing')) {
    const rate = input.writingGross;
    if (rate == null || !Number.isFinite(rate) || rate <= 0) {
      missing.push('writing');
    } else {
      breakdown.writing = Math.round(rate);
    }
  }
  if (skills.includes('speaking')) {
    const rate = input.speakingGross;
    if (rate == null || !Number.isFinite(rate) || rate <= 0) {
      missing.push('speaking');
    } else {
      breakdown.speaking = Math.round(rate);
    }
  }

  const complete = missing.length === 0;
  const amount = complete
    ? breakdown.listening +
      breakdown.reading +
      breakdown.writing +
      breakdown.speaking
    : 0;

  return {
    amount,
    currency: CATALOG_CURRENCY,
    complete,
    examinerPriced,
    missing,
    breakdown,
  };
}

/** Lowest plausible paid price for catalog "from …" display. */
export function computeFromPrice(input: {
  skills: unknown;
  packagePrice?: number | null;
  writingMinGross?: number | null;
  speakingMinGross?: number | null;
}): BookingPriceResult {
  const skills = normalizeBookingSkills(input.skills);
  return computeBookingPrice({
    skills,
    packagePrice: input.packagePrice,
    writingGross: skills.includes('writing')
      ? (input.writingMinGross ?? defaultGrossRate('writing'))
      : null,
    speakingGross: skills.includes('speaking')
      ? (input.speakingMinGross ?? defaultGrossRate('speaking'))
      : null,
  });
}
