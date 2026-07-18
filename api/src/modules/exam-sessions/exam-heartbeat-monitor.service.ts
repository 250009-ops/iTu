import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { ExamSessionsService } from './exam-sessions.service';

@Injectable()
export class ExamHeartbeatMonitorService {
  private readonly logger = new Logger(ExamHeartbeatMonitorService.name);

  constructor(private examSessions: ExamSessionsService) {}

  @Interval(15_000)
  async monitorMissedHeartbeats() {
    try {
      const result = await this.examSessions.checkMissedHeartbeats();
      if (result.checked > 0) {
        this.logger.debug(
          `Auto-suspended ${result.checked} session(s) for missed heartbeat`,
        );
      }
    } catch (err) {
      this.logger.warn(
        `Heartbeat monitor failed: ${err instanceof Error ? err.message : err}`,
      );
    }
  }
}
