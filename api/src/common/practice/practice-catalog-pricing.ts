import type { PracticeBundle, PracticeDisplayPrices } from './practice.types';

/** Default UZS reference prices per credit type (for admin suggestions). */
export const PRACTICE_CREDIT_REFERENCE_PRICES: PracticeDisplayPrices = {
  readingPassages: 12_000,
  readingQuestionTypes: 8_000,
  listeningSections: 10_000,
  listeningQuestionTypes: 8_000,
  aiWritingEssays: 15_000,
};

export function suggestBundlePrice(bundle: PracticeBundle): number {
  let total = 0;
  for (const [key, unitPrice] of Object.entries(
    PRACTICE_CREDIT_REFERENCE_PRICES,
  )) {
    const count = bundle[key as keyof PracticeBundle] ?? 0;
    total += count * (unitPrice ?? 0);
  }
  // 10% bundle discount when 3+ credit types included
  const types = Object.values(bundle).filter((n) => (n ?? 0) > 0).length;
  if (types >= 3) total = Math.round(total * 0.9);
  return total;
}
