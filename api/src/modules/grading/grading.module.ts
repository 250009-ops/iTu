import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { ResultsModule } from '../results/results.module';
import { SettingsModule } from '../settings/settings.module';
import { GradingController } from './grading.controller';
import { GradingService } from './grading.service';
import { GradingSlaService } from './grading-sla.service';

@Module({
  imports: [NotificationsModule, SettingsModule, ResultsModule],
  controllers: [GradingController],
  providers: [GradingService, GradingSlaService],
})
export class GradingModule {}
