/** Platform catalog prices in Uzbek soum (Uzum Checkout). */

export const CATALOG_CURRENCY = 'UZS' as const;

/**
 * Catalog / template prices (UZS).
 *
 * - Listening & Reading: fixed student prices for single-skill packages, and
 *   the platform L/R components inside full mocks (see booking-pricing).
 * - Writing / Speaking / Full: admin “suggested / from” hints only — student
 *   checkout is examiner-driven (approved gross rates), not this flat amount.
 *
 * Full Academic historically listed at 56_000 ≈ listening(16k) + reading(16k)
 * + writing band-7.5 default(15k) + speaking band-7.5 default(15k).
 */
export const UZS_PRICE_BY_PACKAGE_KIND: Record<string, number> = {
  listening: 16_000,
  reading: 16_000,
  writing: 15_000,
  speaking: 15_000,
  'listening+reading+writing+speaking': 56_000,
};

export function uzsPriceForPackageKind(packageKind: string): number {
  return UZS_PRICE_BY_PACKAGE_KIND[packageKind] ?? 16_000;
}
