import { Module } from '@nestjs/common';
import { TechIssuesTelegramController } from './tech-issues-telegram.controller';
import { TechIssuesTelegramPollingService } from './tech-issues-telegram.polling';
import { TechIssuesTelegramService } from './tech-issues-telegram.service';

@Module({
  controllers: [TechIssuesTelegramController],
  providers: [TechIssuesTelegramService, TechIssuesTelegramPollingService],
  exports: [TechIssuesTelegramService],
})
export class TechIssuesTelegramModule {}
