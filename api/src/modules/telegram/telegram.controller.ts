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
import { TelegramService } from './telegram.service';

@ApiExcludeController()
@Controller('integrations/telegram')
export class TelegramController {
  constructor(private readonly telegram: TelegramService) {}

  @Public()
  @SkipThrottle()
  @Post('webhook')
  @HttpCode(200)
  async webhook(
    @Body() update: unknown,
    @Headers('x-telegram-bot-api-secret-token') secret?: string,
  ) {
    if (!this.telegram.verifySecret(secret)) {
      throw new ForbiddenException('Invalid webhook secret');
    }
    // Always ack fast; process best-effort so Telegram doesn't retry storms.
    void this.telegram
      .handleUpdate(update as never)
      .catch(() => undefined);
    return { ok: true };
  }
}
