import {
  Body,
  Controller,
  ForbiddenException,
  Headers,
  HttpCode,
  Post,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';
import { TechIssuesTelegramService } from './tech-issues-telegram.service';

@ApiExcludeController()
@Controller('integrations/telegram-tech-issues')
export class TechIssuesTelegramController {
  constructor(private readonly techIssues: TechIssuesTelegramService) {}

  @Public()
  @SkipThrottle()
  @Post('webhook')
  @HttpCode(200)
  async webhook(
    @Body() update: unknown,
    @Headers('x-telegram-bot-api-secret-token') secret?: string,
  ) {
    if (!this.techIssues.verifySecret(secret)) {
      throw new ForbiddenException('Invalid webhook secret');
    }
    void this.techIssues.handleUpdate(update as never).catch((err) => {
      console.error(
        '[telegram-tech-issues webhook]',
        err instanceof Error ? err.message : err,
      );
    });
    return { ok: true };
  }
}
