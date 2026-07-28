import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TechIssuesTelegramService } from './tech-issues-telegram.service';

/**
 * Dev long-poll / production webhook registration for the admin tech-issues bot.
 * Uses TELEGRAM_TECH_ISSUES_* env vars — separate from the onboarding bot.
 */
@Injectable()
export class TechIssuesTelegramPollingService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(TechIssuesTelegramPollingService.name);
  private running = false;
  private offset = 0;

  constructor(
    private readonly techIssues: TechIssuesTelegramService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.techIssues.isConfigured()) {
      this.logger.warn(
        'TELEGRAM_TECH_ISSUES_BOT_TOKEN is not set — the tech-issues bot is disabled.',
      );
      return;
    }

    await this.techIssues.registerCommands();
    void this.techIssues.warmUp();

    if (!this.shouldPoll()) {
      await this.registerWebhook();
      // Best-effort channel visibility check after webhook mode boots.
      if (this.config.get<string>('NODE_ENV') === 'production') {
        void this.techIssues.sendChannelSmokeTest().then((ok) => {
          this.logger.log(
            ok
              ? 'Tech-issues channel smoke test OK'
              : 'Tech-issues channel smoke test failed — is the bot a channel admin?',
          );
        });
      }
      return;
    }

    // Local/dev polling with the production bot token calls deleteWebhook and
    // bricks production delivery. Only tear down a public webhook when polling
    // was requested explicitly via TELEGRAM_TECH_ISSUES_POLLING=true.
    const explicitPoll =
      this.config.get<string>('TELEGRAM_TECH_ISSUES_POLLING')?.trim() ===
      'true';
    const existing = await this.techIssues.getWebhookInfo();
    const existingUrl = existing?.url?.trim() ?? '';
    const publicWebhook =
      Boolean(existingUrl) && !/localhost|127\.0\.0\.1/.test(existingUrl);

    if (publicWebhook && !explicitPoll) {
      this.logger.warn(
        `Tech-issues bot already has public webhook ${existingUrl} — refusing to poll/deleteWebhook (protects production). Set TELEGRAM_TECH_ISSUES_POLLING=true only if you intentionally want local long-poll with this token.`,
      );
      return;
    }

    await this.techIssues.deleteWebhook();
    this.running = true;
    this.logger.log(
      'Tech-issues Telegram bot polling started (dev mode — no public webhook needed).',
    );
    void this.loop();
  }

  onModuleDestroy(): void {
    this.running = false;
  }

  private shouldPoll(): boolean {
    const explicit = this.config
      .get<string>('TELEGRAM_TECH_ISSUES_POLLING')
      ?.trim();
    if (explicit === 'true') return true;
    if (explicit === 'false') return false;
    // Fall back to the shared TELEGRAM_POLLING flag, then NODE_ENV.
    const shared = this.config.get<string>('TELEGRAM_POLLING')?.trim();
    if (shared === 'true') return true;
    if (shared === 'false') return false;
    return this.config.get<string>('NODE_ENV') !== 'production';
  }

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
        'Tech-issues webhook mode — set TELEGRAM_WEBHOOK_BASE_URL to a public HTTPS host to auto-register.',
      );
      return;
    }

    const secret = this.config
      .get<string>('TELEGRAM_TECH_ISSUES_WEBHOOK_SECRET')
      ?.trim();
    const url = `${base}/api/v1/integrations/telegram-tech-issues/webhook`;
    const ok = await this.techIssues.setWebhook(url, secret);
    this.logger.log(
      ok
        ? `Tech-issues webhook registered at ${url}`
        : `Tech-issues webhook registration failed for ${url}`,
    );
  }

  private async loop(): Promise<void> {
    while (this.running) {
      try {
        const updates = await this.techIssues.getUpdates(this.offset);
        for (const update of updates) {
          if (update.update_id != null) {
            this.offset = update.update_id + 1;
          }
          await this.techIssues.handleUpdate(update);
        }
      } catch (err) {
        this.logger.warn(
          `Tech-issues polling error: ${err instanceof Error ? err.message : err}`,
        );
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }
  }
}
