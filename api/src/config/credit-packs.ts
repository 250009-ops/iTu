/**
 * Institution credit packs. `variantKey` maps into LEMON_VARIANTS (see
 * ./lemon-variants.ts) so the Lemon Squeezy checkout can resolve a buy link.
 * Per-credit price defaults to the institution's `wholesalePrice`; larger packs
 * apply the discount below.
 */
export interface CreditPack {
  id: string;
  label: string;
  credits: number;
  /** Percentage discount off the per-credit wholesale price. */
  discountPct: number;
  /** Key into LEMON_VARIANTS for the Lemon Squeezy variant. */
  variantKey: string;
  popular?: boolean;
}

export const CREDIT_PACKS: CreditPack[] = [
  { id: 'starter', label: 'Starter', credits: 10, discountPct: 0, variantKey: 'credits-10' },
  { id: 'growth', label: 'Growth', credits: 50, discountPct: 10, variantKey: 'credits-50', popular: true },
  { id: 'pro', label: 'Pro', credits: 100, discountPct: 20, variantKey: 'credits-100' },
];

export function findCreditPack(id: string): CreditPack | undefined {
  return CREDIT_PACKS.find((pack) => pack.id === id);
}

/** Total price for a pack given the institution's per-credit wholesale price. */
export function creditPackTotal(pack: CreditPack, pricePerCredit: number): number {
  const discounted = pricePerCredit * (1 - pack.discountPct / 100);
  return Math.round(discounted * pack.credits);
}
