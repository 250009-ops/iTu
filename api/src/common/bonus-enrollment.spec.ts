import {
  bonusEnrollmentLabel,
  isBonusEnrollment,
  isPaidCheckoutOrder,
} from './bonus-enrollment';

describe('bonus enrollment helpers', () => {
  it('treats welcome / referral / admin / institution as bonus', () => {
    expect(isBonusEnrollment({ welcomePromoGranted: true })).toBe(true);
    expect(isBonusEnrollment({ referralRewardGranted: true })).toBe(true);
    expect(isBonusEnrollment({ adminGranted: true })).toBe(true);
    expect(isBonusEnrollment({ institutionGranted: true })).toBe(true);
    expect(isBonusEnrollment({})).toBe(false);
  });

  it('labels bonus sources distinctly', () => {
    expect(bonusEnrollmentLabel({ welcomePromoGranted: true })).toBe(
      'Welcome bonus',
    );
    expect(bonusEnrollmentLabel({ referralRewardGranted: true })).toBe(
      'Referral bonus',
    );
    expect(bonusEnrollmentLabel({ adminGranted: true })).toBe('Complimentary');
    expect(bonusEnrollmentLabel({ institutionGranted: true })).toBe(
      'Centre grant',
    );
    expect(bonusEnrollmentLabel({})).toBeNull();
  });

  it('excludes complimentary $0 rows from paid checkout', () => {
    expect(
      isPaidCheckoutOrder({
        status: 'PAID',
        paymentMethod: 'COMPLIMENTARY',
        amount: 0,
      }),
    ).toBe(false);
    expect(
      isPaidCheckoutOrder({
        status: 'PAID',
        paymentMethod: 'CARD',
        amount: 150000,
      }),
    ).toBe(true);
  });
});
