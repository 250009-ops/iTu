import {
  WELCOME_PROMO_WINDOW_DAYS,
  countDisqualifyingCompletedMocks,
  isWelcomePromoClaimed,
  isWelcomePromoEligible,
  isWelcomePromoEligibleForSkill,
  isWithinWelcomePromoWindow,
  welcomePromoExpiresAt,
} from './welcome-promo';

describe('welcome promo eligibility', () => {
  const now = new Date('2026-07-18T12:00:00.000Z');
  const freshUser = { createdAt: new Date('2026-07-10T12:00:00.000Z') };
  const staleUser = {
    createdAt: new Date(
      now.getTime() - (WELCOME_PROMO_WINDOW_DAYS + 1) * 86_400_000,
    ),
  };
  const emptyProfile = {
    welcomeListeningClaimedAt: null,
    welcomeReadingClaimedAt: null,
  };

  it('expires after the welcome window', () => {
    const expires = welcomePromoExpiresAt(freshUser.createdAt);
    expect(expires.toISOString()).toBe('2026-08-09T12:00:00.000Z');
    expect(isWithinWelcomePromoWindow(freshUser.createdAt, now)).toBe(true);
    expect(isWithinWelcomePromoWindow(staleUser.createdAt, now)).toBe(false);
  });

  it('requires zero non-welcome completions and account age', () => {
    expect(
      isWelcomePromoEligibleForSkill(
        emptyProfile,
        freshUser,
        'listening',
        0,
        now,
      ),
    ).toBe(true);
    expect(
      isWelcomePromoEligibleForSkill(
        emptyProfile,
        freshUser,
        'listening',
        1,
        now,
      ),
    ).toBe(false);
    expect(
      isWelcomePromoEligibleForSkill(
        emptyProfile,
        staleUser,
        'listening',
        0,
        now,
      ),
    ).toBe(false);
  });

  it('tracks claimed skills independently', () => {
    const partialProfile = {
      welcomeListeningClaimedAt: new Date('2026-07-12T10:00:00.000Z'),
      welcomeReadingClaimedAt: null,
    };

    expect(isWelcomePromoClaimed(partialProfile, 'listening')).toBe(true);
    expect(isWelcomePromoClaimed(partialProfile, 'reading')).toBe(false);
    expect(
      isWelcomePromoEligibleForSkill(
        partialProfile,
        freshUser,
        'listening',
        0,
        now,
      ),
    ).toBe(false);
    expect(
      isWelcomePromoEligibleForSkill(
        partialProfile,
        freshUser,
        'reading',
        0,
        now,
      ),
    ).toBe(true);
    expect(
      isWelcomePromoEligible(partialProfile, freshUser, 0, now),
    ).toBe(true);
  });

  it('keeps the other welcome skill after completing a free welcome mock', () => {
    const partialProfile = {
      welcomeListeningClaimedAt: new Date('2026-07-12T10:00:00.000Z'),
      welcomeReadingClaimedAt: null,
    };
    // Completing welcome Listening is not disqualifying.
    expect(
      countDisqualifyingCompletedMocks([
        { status: 'COMPLETED', welcomePromoGranted: true },
      ]),
    ).toBe(0);
    expect(
      isWelcomePromoEligibleForSkill(
        partialProfile,
        freshUser,
        'reading',
        0,
        now,
      ),
    ).toBe(true);
    // A paid / grant completion still ends the welcome window.
    expect(
      countDisqualifyingCompletedMocks([
        { status: 'COMPLETED', welcomePromoGranted: true },
        { status: 'COMPLETED', welcomePromoGranted: false },
      ]),
    ).toBe(1);
    expect(
      isWelcomePromoEligibleForSkill(
        partialProfile,
        freshUser,
        'reading',
        1,
        now,
      ),
    ).toBe(false);
  });

  it('is fully ineligible once both promos are claimed', () => {
    const claimedProfile = {
      welcomeListeningClaimedAt: new Date('2026-07-12T10:00:00.000Z'),
      welcomeReadingClaimedAt: new Date('2026-07-13T10:00:00.000Z'),
    };

    expect(isWelcomePromoEligible(claimedProfile, freshUser, 0, now)).toBe(
      false,
    );
  });
});
