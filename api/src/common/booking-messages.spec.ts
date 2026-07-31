import {
  assertSpeakingSlotMatchesMockDay,
  formatMockDayLabel,
  mockStartDateTimeInTimeZone,
  studentBookingConfirmationMessage,
} from './booking-messages';

describe('booking-messages', () => {
  const tz = 'Asia/Tashkent';

  it('builds mock start in Asia/Tashkent, not server-local hours', () => {
    const start = mockStartDateTimeInTimeZone('2026-08-01', '08:30', tz);
    expect(start.toISOString()).toBe('2026-08-01T03:30:00.000Z');
  });

  it('rejects speaking slots on a different calendar day', () => {
    const slot = new Date('2026-07-31T10:20:00.000Z'); // 15:20 Tashkent Jul 31
    expect(() =>
      assertSpeakingSlotMatchesMockDay(slot, '2026-08-01T03:30:00.000Z', tz),
    ).toThrow(/same day/);
  });

  it('accepts speaking slots on the mock calendar day', () => {
    const slot = new Date('2026-08-01T10:20:00.000Z'); // 15:20 Tashkent Aug 1
    expect(() =>
      assertSpeakingSlotMatchesMockDay(slot, '2026-08-01T03:30:00.000Z', tz),
    ).not.toThrow();
  });

  it('formats speaking-only confirmation from the speaking slot', () => {
    const msg = studentBookingConfirmationMessage({
      skills: ['speaking'],
      mockDate: '2026-08-01T03:30:00.000Z',
      mockTime: '08:30',
      speakingStartsAt: new Date('2026-08-01T10:20:00.000Z'),
      timeZone: tz,
    });
    expect(msg.title).toBe('Speaking booked');
    expect(msg.body).toContain('15:20');
    expect(msg.body).toContain('1 August 2026');
    expect(msg.body).not.toContain('08:30');
  });

  it('includes speaking time for full mocks', () => {
    const msg = studentBookingConfirmationMessage({
      skills: ['listening', 'reading', 'writing', 'speaking'],
      mockDate: '2026-08-01',
      mockTime: '09:00',
      speakingStartsAt: new Date('2026-08-01T10:20:00.000Z'),
      timeZone: tz,
    });
    expect(msg.title).toBe('Mock booked');
    expect(msg.body).toContain('09:00');
    expect(msg.body).toContain('15:20');
  });

  it('formats mock day labels in platform timezone', () => {
    expect(formatMockDayLabel('2026-08-01T03:30:00.000Z', '08:30', tz)).toBe(
      '1 August 2026 at 08:30',
    );
  });
});
