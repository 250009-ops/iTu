/** Platform catalog prices in Uzbek soum (Uzum Checkout). */
export const CATALOG_CURRENCY = 'UZS' as const;

export const UZS_PRICE_BY_PACKAGE_KIND: Record<string, number> = {
  'listening+reading+writing+speaking': 56_000,
  listening: 16_000,
  reading: 16_000,
  speaking: 16_000,
  writing: 16_000,
};

export function uzsPriceForPackageKind(packageKind: string): number {
  return UZS_PRICE_BY_PACKAGE_KIND[packageKind] ?? 16_000;
}
