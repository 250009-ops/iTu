"use client";

/**
 * @deprecated Institution credit wallet UI is retired.
 * Centres purchase mock test sets via `/institution/mocks/shop`.
 * This file is kept only so accidental imports fail loudly in review —
 * the `/institution/credits` route redirects to the set shop.
 *
 * Do not remount this as the main product surface.
 */
export function InstitutionCreditsView() {
  return null;
}
