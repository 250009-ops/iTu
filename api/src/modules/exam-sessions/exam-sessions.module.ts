import { Module, forwardRef } from '@nestjs/common';
import { GradingModule } from '../grading/grading.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { ResultsModule } from '../results/results.module';
import { SettingsModule } from '../settings/settings.module';
import { AutoScoringService } from './auto-scoring.service';
import { ExamHeartbeatMonitorService } from './exam-heartbeat-monitor.service';
import { ExamSessionsController } from './exam-sessions.controller';
import { ExamSessionsService } from './exam-sessions.service';
import { ExamTimerService } from './exam-timer.service';

@Module({
  imports: [
    SettingsModule,
    NotificationsModule,
    ResultsModule,
    GradingModule,
    forwardRef(() => RealtimeModule),
  ],
  controllers: [ExamSessionsController],
  providers: [
    ExamSessionsService,
    AutoScoringService,
    ExamTimerService,
    ExamHeartbeatMonitorService,
  ],
  exports: [ExamSessionsService, AutoScoringService],
})
export class ExamSessionsModule {}
