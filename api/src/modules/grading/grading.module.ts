import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { ResultsModule } from '../results/results.module';
import { SettingsModule } from '../settings/settings.module';
import { GradingController } from './grading.controller';
import { GradingService } from './grading.service';
import { GradingSlaService } from './grading-sla.service';
import { WritingAiEvaluationService } from './writing-ai-evaluation.service';
import { WritingPdfService } from './writing-pdf.service';

@Module({
  imports: [NotificationsModule, SettingsModule, ResultsModule, RealtimeModule],
  controllers: [GradingController],
  providers: [
    GradingService,
    GradingSlaService,
    WritingAiEvaluationService,
    WritingPdfService,
  ],
  exports: [WritingAiEvaluationService, WritingPdfService],
})
export class GradingModule {}
