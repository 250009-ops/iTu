import { Module } from '@nestjs/common';
import { TelegramController } from './telegram.controller';
import { TelegramPollingService } from './telegram.polling';
import { TelegramService } from './telegram.service';

@Module({
  controllers: [TelegramController],
  providers: [TelegramService, TelegramPollingService],
  exports: [TelegramService],
})
export class TelegramModule {}
