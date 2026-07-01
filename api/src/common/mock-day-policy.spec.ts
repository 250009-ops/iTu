import {
  calendarDateIsoInTimeZone,
  canStartMockOnDay,
  mockDayCutoffDateTime,
  resolveMockDayCutoffAt,
  shouldMarkMissed,
  speakingJoinWindow,
} from './mock-day-policy';

describe('mockDayCutoffDateTime', () => {
  it('uses 23:59 platform time on the mock calendar day', () => {
    const cutoff = mockDayCutoffDateTime('2026-07-08', '23:59', 'Asia/Tashkent');
    expect(cutoff.toISOString()).toBe('2026-07-08T18:59:59.000Z');
  });

  it('combines mock date with cutoff time on the same platform day', () => {
    const cutoff = mockDayCutoffDateTime('2026-07-08', '18:00', 'Asia/Tashkent');
    expect(cutoff.toISOString()).toBe('2026-07-08T13:00:59.000Z');
  });
});

describe('resolveMockDayCutoffAt', () => {
  it('allows a future mock day without checking cutoff against today', () => {
    const cutoff = resolveMockDayCutoffAt(
      '2026-07-08',
      '18:00',
      'Asia/Tashkent',
      new Date('2026-06-30T20:00:00.000Z'),
    );
    expect(cutoff.toISOString()).toBe('2026-07-08T13:00:59.000Z');
  });

  it('rejects today after cutoff has passed in platform timezone', () => {
    expect(() =>
      resolveMockDayCutoffAt(
        '2026-06-30',
        '18:00',
        'Asia/Tashkent',
        new Date('2026-06-30T14:00:00.000Z'),
      ),
    ).toThrow(/already passed/);
  });
});

describe('shouldMarkMissed', () => {
  it('marks missed when cutoff passed and never started', () => {
    const cutoff = new Date('2026-07-08T13:00:00.000Z');
    expect(
      shouldMarkMissed(
        {
          status: 'ENROLLED',
          mockDayCutoffAt: cutoff,
          examStartedAt: null,
        },
        { checkInAt: null, sectionAttempts: [] },
        new Date('2026-07-08T13:01:00.000Z'),
      ),
    ).toBe(true);
  });

  it('does not mark missed after check-in', () => {
    const cutoff = new Date('2026-07-08T13:00:00.000Z');
    expect(
      shouldMarkMissed(
        {
          status: 'ENROLLED',
          mockDayCutoffAt: cutoff,
          examStartedAt: null,
        },
        { checkInAt: new Date('2026-07-08T05:00:00.000Z'), sectionAttempts: [] },
        new Date('2026-07-08T14:00:00.000Z'),
      ),
    ).toBe(false);
  });
});

describe('canStartMockOnDay', () => {
  it('allows flexible grant any time on mock day before cutoff', () => {
    const mockDate = new Date('2026-07-08T12:00:00.000Z');
    const result = canStartMockOnDay(
      {
        mockDate,
        mockDayCutoffAt: new Date('2026-07-08T13:00:00.000Z'),
        adminGranted: true,
        mockTime: null,
        status: 'ENROLLED',
        examStartedAt: null,
      },
      new Date('2026-07-08T09:30:00.000Z'),
    );
    expect(result.allowed).toBe(true);
  });

  it('uses platform calendar day for mock-day checks', () => {
    const mockDate = new Date('2026-07-07T19:00:00.000Z');
    const now = new Date('2026-07-07T19:30:00.000Z');
    expect(calendarDateIsoInTimeZone(mockDate, 'Asia/Tashkent')).toBe('2026-07-08');
    expect(calendarDateIsoInTimeZone(now, 'Asia/Tashkent')).toBe('2026-07-08');
    const result = canStartMockOnDay(
      {
        mockDate,
        mockDayCutoffAt: new Date('2026-07-08T18:59:59.000Z'),
        adminGranted: true,
        mockTime: null,
        status: 'ENROLLED',
        examStartedAt: null,
      },
      now,
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
