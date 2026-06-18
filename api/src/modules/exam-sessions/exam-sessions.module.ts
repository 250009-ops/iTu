import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { ResultsModule } from '../results/results.module';
import { SettingsModule } from '../settings/settings.module';
import { AutoScoringService } from './auto-scoring.service';
import { ExamSessionsController } from './exam-sessions.controller';
import { ExamSessionsService } from './exam-sessions.service';
import { ExamTimerService } from './exam-timer.service';

@Module({
  imports: [SettingsModule, NotificationsModule, ResultsModule],
  controllers: [ExamSessionsController],
  providers: [ExamSessionsService, AutoScoringService, ExamTimerService],
  exports: [ExamSessionsService],
})
export class ExamSessionsModule {}
