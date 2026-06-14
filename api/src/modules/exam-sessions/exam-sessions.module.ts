import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { SettingsModule } from '../settings/settings.module';
import { AutoScoringService } from './auto-scoring.service';
import { ExamSessionsController } from './exam-sessions.controller';
import { ExamSessionsService } from './exam-sessions.service';

@Module({
  imports: [SettingsModule, NotificationsModule],
  controllers: [ExamSessionsController],
  providers: [ExamSessionsService, AutoScoringService],
  exports: [ExamSessionsService],
})
export class ExamSessionsModule {}
