import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { SettingsModule } from '../settings/settings.module';
import { GradingController } from './grading.controller';
import { GradingService } from './grading.service';

@Module({
  imports: [NotificationsModule, SettingsModule],
  controllers: [GradingController],
  providers: [GradingService],
})
export class GradingModule {}
