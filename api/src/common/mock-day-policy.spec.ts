import {
  canStartMockOnDay,
  mockDayCutoffDateTime,
  shouldMarkMissed,
  speakingJoinWindow,
} from './mock-day-policy';

describe('mockDayCutoffDateTime', () => {
  it('combines mock date with cutoff time on same day', () => {
    const cutoff = mockDayCutoffDateTime('2026-07-08', '18:00');
    expect(cutoff.getHours()).toBe(18);
    expect(cutoff.getMinutes()).toBe(0);
  });
});

describe('shouldMarkMissed', () => {
  it('marks missed when cutoff passed and never started', () => {
    const cutoff = new Date('2026-07-08T18:00:00');
    expect(
      shouldMarkMissed(
        {
          status: 'ENROLLED',
          mockDayCutoffAt: cutoff,
          examStartedAt: null,
        },
        { checkInAt: null, sectionAttempts: [] },
        new Date('2026-07-08T18:01:00'),
      ),
    ).toBe(true);
  });

  it('does not mark missed after check-in', () => {
    const cutoff = new Date('2026-07-08T18:00:00');
    expect(
      shouldMarkMissed(
        {
          status: 'ENROLLED',
          mockDayCutoffAt: cutoff,
          examStartedAt: null,
        },
        { checkInAt: new Date('2026-07-08T10:00:00'), sectionAttempts: [] },
        new Date('2026-07-08T19:00:00'),
      ),
    ).toBe(false);
  });
});

describe('canStartMockOnDay', () => {
  it('allows flexible grant any time on mock day before cutoff', () => {
    const mockDate = new Date('2026-07-08T12:00:00');
    const result = canStartMockOnDay(
      {
        mockDate,
        mockDayCutoffAt: new Date('2026-07-08T18:00:00'),
        adminGranted: true,
        mockTime: null,
        status: 'ENROLLED',
        examStartedAt: null,
      },
      new Date('2026-07-08T14:30:00'),
    );
    expect(result.allowed).toBe(true);
  });
});

describe('speakingJoinWindow', () => {
  it('blocks join until 5 minutes before slot', () => {
    const scheduledAt = new Date('2026-07-08T15:00:00');
    const early = speakingJoinWindow(scheduledAt, {
      now: new Date('2026-07-08T14:50:00'),
    });
    expect(early.allowed).toBe(false);
    expect(early.tooEarly).toBe(true);

    const onTime = speakingJoinWindow(scheduledAt, {
      now: new Date('2026-07-08T14:55:00'),
    });
    expect(onTime.allowed).toBe(true);
  });
});
