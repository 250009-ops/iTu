import { ExamTimerService, SectionTimerState } from './exam-timer.service';

describe('ExamTimerService', () => {
  const service = new ExamTimerService({ isAvailable: () => false } as never);

  it('returns frozen remaining when timer is paused', () => {
    const state: SectionTimerState = {
      startedAt: new Date(Date.now() - 120_000).toISOString(),
      durationSec: 2400,
      pausedAt: new Date().toISOString(),
      remainingSec: 900,
    };
    expect(service.isPaused(state)).toBe(true);
    expect(service.remainingSeconds(state)).toBe(900);
  });

  it('counts down elapsed time when not paused', () => {
    const state: SectionTimerState = {
      startedAt: new Date(Date.now() - 60_000).toISOString(),
      durationSec: 120,
    };
    expect(service.isPaused(state)).toBe(false);
    expect(service.remainingSeconds(state)).toBe(60);
  });
});
