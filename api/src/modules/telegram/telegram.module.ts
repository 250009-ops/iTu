import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { TelegramController } from './telegram.controller';
import { TelegramPollingService } from './telegram.polling';
import { TelegramService } from './telegram.service';

@Module({
  imports: [NotificationsModule],
  controllers: [TelegramController],
  providers: [TelegramService, TelegramPollingService],
  exports: [TelegramService],
})
export class TelegramModule {}
