import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { SettingsModule } from '../settings/settings.module';
import { SupportController } from './support.controller';
import { SupportSlaService } from './support-sla.service';
import { SupportService } from './support.service';

@Module({
  imports: [NotificationsModule, SettingsModule],
  controllers: [SupportController],
  providers: [SupportService, SupportSlaService],
  exports: [SupportService],
})
export class SupportModule {}
