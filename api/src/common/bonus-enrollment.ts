/**
 * Zero-charge student enrollments (offers / grants), not paid purchases.
 * Orders for these still use status PAID + paymentMethod COMPLIMENTARY for
 * fulfillment; they must not be labeled or KPI'd as paid checkout.
 */

export type BonusEnrollmentFlags = {
  welcomePromoGranted?: boolean | null;
  referralRewardGranted?: boolean | null;
  adminGranted?: boolean | null;
  institutionGranted?: boolean | null;
};

export function isBonusEnrollment(e: BonusEnrollmentFlags): boolean {
  return Boolean(
    e.welcomePromoGranted ||
      e.referralRewardGranted ||
      e.adminGranted ||
      e.institutionGranted,
  );
}

/** Student / admin short label for a bonus enrollment; null when paid. */
export function bonusEnrollmentLabel(
  e: BonusEnrollmentFlags,
): 'Welcome bonus' | 'Referral bonus' | 'Complimentary' | 'Centre grant' | null {
  if (e.welcomePromoGranted) return 'Welcome bonus';
  if (e.referralRewardGranted) return 'Referral bonus';
  if (e.adminGranted) return 'Complimentary';
  if (e.institutionGranted) return 'Centre grant';
  return null;
}

/** True when an order is a real paid checkout (revenue), not a $0 grant. */
export function isPaidCheckoutOrder(order: {
  status: string;
  paymentMethod: string;
  amount: number;
}): boolean {
  return (
    order.status === 'PAID' &&
    order.paymentMethod !== 'COMPLIMENTARY' &&
    order.amount > 0
  );
}
