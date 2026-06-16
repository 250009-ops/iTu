import { ConflictException, Injectable } from '@nestjs/common';
import { ExamSkill } from '@prisma/client';
import { RedisService } from '../../common/redis/redis.service';

export type SectionTimerState = {
  startedAt: string;
  durationSec: number;
};

@Injectable()
export class ExamTimerService {
  constructor(private redis: RedisService) {}

  isRedisBacked(): boolean {
    return this.redis.isAvailable();
  }

  private timerKey(sessionId: string, skill: ExamSkill): string {
    return `exam:timer:${sessionId}:${skill.toLowerCase()}`;
  }

  private lockKey(sessionId: string): string {
    return `exam:lock:${sessionId}`;
  }

  async withSessionLock<T>(sessionId: string, fn: () => Promise<T>): Promise<T> {
    try {
      return await this.redis.withLock(this.lockKey(sessionId), 30, fn);
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.includes('Could not acquire lock')
      ) {
        throw new ConflictException(
          'Exam session is busy — please retry in a moment',
        );
      }
      throw err;
    }
  }

  async setSectionTimer(
    sessionId: string,
    skill: ExamSkill,
    startedAt: Date,
    durationSec: number,
  ): Promise<void> {
    await this.redis.setJson(
      this.timerKey(sessionId, skill),
      {
        startedAt: startedAt.toISOString(),
        durationSec,
      } satisfies SectionTimerState,
      durationSec + 3600,
    );
  }

  async getSectionTimer(
    sessionId: string,
    skill: ExamSkill,
  ): Promise<SectionTimerState | null> {
    return this.redis.getJson<SectionTimerState>(
      this.timerKey(sessionId, skill),
    );
  }

  async clearSectionTimer(sessionId: string, skill: ExamSkill): Promise<void> {
    await this.redis.del(this.timerKey(sessionId, skill));
  }

  remainingSeconds(state: SectionTimerState, now = Date.now()): number {
    const started = new Date(state.startedAt).getTime();
    const elapsed = Math.floor((now - started) / 1000);
    return Math.max(0, state.durationSec - elapsed);
  }
}
