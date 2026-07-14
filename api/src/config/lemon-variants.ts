/** Lemon Squeezy variant IDs — must match package slugs in the catalog. */
export const LEMON_VARIANTS: Record<string, string> = {
  'full-academic-mock': '1878449',
  'writing-only': '1878450',
  'speaking-only': '1878452',
  'reading-only': '1878453',
  'listening-only': '1878455',

  // Institution credit packs (keys map to CREDIT_PACKS[].variantKey).
  // Replace the placeholders below with the real Lemon Squeezy variant IDs, or
  // override via the LEMON_SQUEEZY_VARIANTS env JSON.
  'credits-10': '',
  'credits-50': '',
  'credits-100': '',
};
