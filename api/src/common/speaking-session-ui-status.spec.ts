import {
  isActionableSpeakingUiStatus,
  resolveSpeakingSessionUiStatus,
  speakingSessionEndsAt,
} from './speaking-session-ui-status';

describe('resolveSpeakingSessionUiStatus', () => {
  const scheduledAt = new Date('2026-07-31T10:20:00.000Z');

  it('maps graded sessions to graded even when status is COMPLETED', () => {
    expect(
      resolveSpeakingSessionUiStatus(
        {
          status: 'COMPLETED',
          scheduledAt,
          startedAt: new Date('2026-07-31T10:25:00.000Z'),
          grade: { overallBand: 5.5 },
        },
        new Date('2026-07-31T12:00:00.000Z'),
      ),
    ).toBe('graded');
  });

  it('maps completed ungraded sessions to awaiting_grade', () => {
    expect(
      resolveSpeakingSessionUiStatus(
        {
          status: 'COMPLETED',
          scheduledAt,
          startedAt: new Date('2026-07-31T10:25:00.000Z'),
          grade: null,
        },
        new Date('2026-07-31T12:00:00.000Z'),
      ),
    ).toBe('awaiting_grade');
  });

  it('does not treat past completed/graded as upcoming', () => {
    const ui = resolveSpeakingSessionUiStatus(
      {
        status: 'COMPLETED',
        scheduledAt,
        startedAt: new Date('2026-07-31T10:25:36.203Z'),
        grade: { overallBand: 5.5 },
      },
      new Date('2026-07-31T10:30:00.000Z'),
    );
    expect(ui).toBe('graded');
    expect(isActionableSpeakingUiStatus(ui)).toBe(false);
  });

  it('keeps future SCHEDULED as upcoming', () => {
    expect(
      resolveSpeakingSessionUiStatus(
        { status: 'SCHEDULED', scheduledAt, startedAt: null, grade: null },
        new Date('2026-07-31T09:00:00.000Z'),
      ),
    ).toBe('upcoming');
  });

  it('marks SCHEDULED as live during the slot window', () => {
    expect(
      resolveSpeakingSessionUiStatus(
        { status: 'SCHEDULED', scheduledAt, startedAt: null, grade: null },
        new Date('2026-07-31T10:25:00.000Z'),
      ),
    ).toBe('live');
  });

  it('surfaces past unstarted SCHEDULED as no_show after late-join window', () => {
    expect(
      resolveSpeakingSessionUiStatus(
        { status: 'SCHEDULED', scheduledAt, startedAt: null, grade: null },
        new Date('2026-07-31T10:36:00.000Z'),
      ),
    ).toBe('no_show');
  });

  it('keeps ACTIVE as live', () => {
    expect(
      resolveSpeakingSessionUiStatus(
        {
          status: 'ACTIVE',
          scheduledAt,
          startedAt: new Date('2026-07-31T10:21:00.000Z'),
          grade: null,
        },
        new Date('2026-07-31T10:45:00.000Z'),
      ),
    ).toBe('live');
  });

  it('computes endsAt from scheduled start', () => {
    expect(speakingSessionEndsAt(scheduledAt)?.toISOString()).toBe(
      '2026-07-31T10:40:00.000Z',
    );
  });
});
