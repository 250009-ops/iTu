import {
  assertSpeakingGridTime,
  ceilSpeakingGridTime,
  floorSpeakingGridTime,
  isSpeakingGridInstant,
  isSpeakingGridTime,
  wallClockHhMmInTimeZone,
} from './speaking-slot-grid';
import { zonedWallClockToUtc } from './mock-day-policy';

describe('speaking-slot-grid', () => {
  it('accepts only :00 / :20 / :40', () => {
    expect(isSpeakingGridTime('15:00')).toBe(true);
    expect(isSpeakingGridTime('15:20')).toBe(true);
    expect(isSpeakingGridTime('15:40')).toBe(true);
    expect(isSpeakingGridTime('15:49')).toBe(false);
    expect(isSpeakingGridTime('15:29')).toBe(false);
    expect(isSpeakingGridTime('15:25')).toBe(false);
    expect(isSpeakingGridTime('15:15')).toBe(false);
  });

  it('rejects off-grid times via assert', () => {
    expect(() => assertSpeakingGridTime('15:49')).toThrow(/20-minute grid/);
  });

  it('snaps availability bounds onto the grid', () => {
    expect(ceilSpeakingGridTime('09:05')).toBe('09:20');
    expect(ceilSpeakingGridTime('09:20')).toBe('09:20');
    expect(ceilSpeakingGridTime('09:41')).toBe('10:00');
    expect(floorSpeakingGridTime('17:10')).toBe('17:00');
    expect(floorSpeakingGridTime('17:40')).toBe('17:40');
  });

  it('treats Asia/Tashkent wall times as grid instants after UTC conversion', () => {
    const startsAt = zonedWallClockToUtc(
      '2026-07-27',
      15,
      40,
      0,
      'Asia/Tashkent',
    );
    // 15:40 Tashkent = 10:40 UTC
    expect(startsAt.toISOString()).toBe('2026-07-27T10:40:00.000Z');
    expect(wallClockHhMmInTimeZone(startsAt, 'Asia/Tashkent')).toBe('15:40');
    expect(isSpeakingGridInstant(startsAt, 'Asia/Tashkent')).toBe(true);

    const offGridAsUtc = new Date('2026-07-27T15:49:00.000Z');
    // 15:49Z displays as 20:49 in Tashkent — the classic +5h confusion.
    expect(wallClockHhMmInTimeZone(offGridAsUtc, 'Asia/Tashkent')).toBe('20:49');
    expect(isSpeakingGridInstant(offGridAsUtc, 'Asia/Tashkent')).toBe(false);
  });
});
