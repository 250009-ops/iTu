import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TelegramService } from './telegram.service';

/**
 * Dev-friendly long-polling loop for the Telegram bot.
 *
 * Telegram can only deliver webhooks to a public HTTPS URL, so on localhost the
 * webhook never fires. When enabled, this service pulls updates via getUpdates
 * so the bot works without any tunnel. In production leave polling off and use
 * the webhook (see TelegramController + .env.example).
 *
 * Enabled when a bot token is set AND either:
 *   - TELEGRAM_POLLING="true", or
 *   - NODE_ENV !== "production" (and TELEGRAM_POLLING !== "false").
 */
@Injectable()
export class TelegramPollingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramPollingService.name);
  private running = false;
  private offset = 0;

  constructor(
    private readonly telegram: TelegramService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.telegram.isConfigured()) {
      this.logger.warn(
        'TELEGRAM_BOT_TOKEN is not set — the onboarding bot is disabled.',
      );
      return;
    }

    // Command menu works in both webhook and polling modes.
    await this.telegram.registerCommands();

    // Prime DB pool + Telegram keep-alive so the first user message is fast.
    void this.telegram.warmUp();

    if (!this.shouldPoll()) {
      await this.registerWebhook();
      return;
    }

    await this.telegram.deleteWebhook();
    this.running = true;
    this.logger.log(
      'Telegram bot polling started (dev mode — no public webhook needed).',
    );
    void this.loop();
  }

  onModuleDestroy(): void {
    this.running = false;
  }

  private shouldPoll(): boolean {
    const explicit = this.config.get<string>('TELEGRAM_POLLING')?.trim();
    if (explicit === 'true') return true;
    if (explicit === 'false') return false;
    return this.config.get<string>('NODE_ENV') !== 'production';
  }

  /**
   * Webhook mode (production): auto-register the webhook so the bot works right
   * after deploy. Derives the URL from TELEGRAM_WEBHOOK_BASE_URL or APP_URL
   * (public HTTPS host); the "/api/v1" prefix matches the global route prefix.
   */
  private async registerWebhook(): Promise<void> {
    const base = (
      this.config.get<string>('TELEGRAM_WEBHOOK_BASE_URL') ||
      this.config.get<string>('APP_URL') ||
      ''
    )
      .trim()
      .replace(/\/$/, '');

    if (!base || /localhost|127\.0\.0\.1/.test(base)) {
      this.logger.log(
        'Telegram webhook mode — set TELEGRAM_WEBHOOK_BASE_URL to a public HTTPS host to auto-register.',
      );
      return;
    }

    const secret = this.config.get<string>('TELEGRAM_WEBHOOK_SECRET')?.trim();
    const url = `${base}/api/v1/integrations/telegram/webhook`;
    const ok = await this.telegram.setWebhook(url, secret);
    this.logger.log(
      ok
        ? `Telegram webhook registered at ${url}`
        : `Telegram webhook registration failed for ${url}`,
    );
  }

  private async loop(): Promise<void> {
    while (this.running) {
      try {
        const updates = await this.telegram.getUpdates(this.offset);
        for (const update of updates) {
          if (update.update_id != null) {
            this.offset = update.update_id + 1;
          }
          await this.telegram.handleUpdate(update);
        }
      } catch (err) {
        this.logger.warn(
          `Telegram polling error: ${err instanceof Error ? err.message : err}`,
        );
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }
  }
}
