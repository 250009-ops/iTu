import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  InstitutionMemberStatus,
  InstitutionStatus,
  UserRole,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { AuditAction } from '../../common/audit/audit.actions';
import { AuditService } from '../../common/audit/audit.service';
import { MailService } from '../../common/mail/mail.service';
import { PrismaService } from '../../prisma/prisma.service';

const SETUP_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const RATE_LIMIT_MS = 700;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Button labels for the reply keyboard ("attached" buttons that auto-send text).
const BTN_APPLY = '🏫 Apply as institution';
const BTN_CANCEL = '❌ Cancel';

/** Persistent keyboard shown during a wizard: a single Cancel button. */
const KB_CANCEL = {
  keyboard: [[BTN_CANCEL]],
  resize_keyboard: true,
  is_persistent: true,
};
/** Entry keyboard shown when there is no active conversation. */
const KB_APPLY = {
  keyboard: [[BTN_APPLY]],
  resize_keyboard: true,
  is_persistent: true,
};
/** Clears the reply keyboard once a flow is complete. */
const KB_REMOVE = { remove_keyboard: true };

type Flow = 'institution' | 'student';

interface Conversation {
  flow: Flow;
  step: number;
  institutionId?: string;
  data: Record<string, string>;
  lastAt: number;
}

interface TelegramUpdate {
  update_id?: number;
  message?: {
    chat: { id: number };
    from?: { id: number; first_name?: string };
    text?: string;
  };
}

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private readonly conversations = new Map<number, Conversation>();

  constructor(
    private prisma: PrismaService,
    private mail: MailService,
    private audit: AuditService,
    private config: ConfigService,
  ) {}

  isConfigured(): boolean {
    return Boolean(this.config.get<string>('TELEGRAM_BOT_TOKEN')?.trim());
  }

  verifySecret(headerSecret?: string): boolean {
    const secret = this.config.get<string>('TELEGRAM_WEBHOOK_SECRET')?.trim();
    // If no secret is configured, accept (dev). In prod, always set the secret.
    if (!secret) return true;
    return headerSecret === secret;
  }

  private appUrl(): string {
    return this.config
      .get<string>('APP_URL', 'http://localhost:3000')
      .replace(/\/$/, '');
  }

  private token(): string | undefined {
    return this.config.get<string>('TELEGRAM_BOT_TOKEN')?.trim() || undefined;
  }

  private async send(
    chatId: number,
    text: string,
    replyMarkup?: unknown,
  ): Promise<void> {
    const token = this.token();
    if (!token) {
      this.logger.warn(`Telegram not configured — message to ${chatId}: ${text}`);
      return;
    }
    try {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
          ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
        }),
      });
    } catch (err) {
      this.logger.error(
        `Failed to send Telegram message: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  /**
   * Warms the DB connection pool and the Telegram HTTPS keep-alive on boot so
   * the first real user message doesn't pay the cold-start cost.
   */
  async warmUp(): Promise<void> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      /* ignore — warm-up is best-effort */
    }
    const token = this.token();
    if (token) {
      try {
        await fetch(`https://api.telegram.org/bot${token}/getMe`);
      } catch {
        /* ignore */
      }
    }
  }

  /** Long-poll for updates (dev mode — no public webhook required). */
  async getUpdates(offset: number, timeoutSec = 25): Promise<TelegramUpdate[]> {
    const token = this.token();
    if (!token) return [];
    const res = await fetch(
      `https://api.telegram.org/bot${token}/getUpdates?timeout=${timeoutSec}&offset=${offset}`,
    );
    if (!res.ok) {
      throw new Error(`getUpdates HTTP ${res.status}`);
    }
    const body = (await res.json()) as {
      ok: boolean;
      result?: TelegramUpdate[];
    };
    return body.result ?? [];
  }

  /** Registers the webhook with Telegram (production). Returns success. */
  async setWebhook(url: string, secret?: string): Promise<boolean> {
    const token = this.token();
    if (!token) return false;
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${token}/setWebhook`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url,
            secret_token: secret || undefined,
            allowed_updates: ['message'],
          }),
        },
      );
      const body = (await res.json()) as { ok?: boolean; description?: string };
      if (!body.ok) {
        this.logger.warn(`setWebhook failed: ${body.description ?? 'unknown'}`);
      }
      return body.ok === true;
    } catch (err) {
      this.logger.warn(
        `setWebhook error: ${err instanceof Error ? err.message : err}`,
      );
      return false;
    }
  }

  /** Removes any registered webhook so getUpdates (polling) can run. */
  async deleteWebhook(): Promise<void> {
    const token = this.token();
    if (!token) return;
    try {
      await fetch(
        `https://api.telegram.org/bot${token}/deleteWebhook?drop_pending_updates=false`,
      );
    } catch {
      // Non-fatal — polling will still surface the error if unresolved.
    }
  }

  /** Registers the command menu so the Telegram "Menu" button lists commands. */
  async registerCommands(): Promise<void> {
    const token = this.token();
    if (!token) return;
    try {
      await fetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commands: [
            { command: 'start', description: 'Start / apply as an institution' },
            { command: 'cancel', description: 'Cancel the current step' },
          ],
        }),
      });
    } catch {
      // Non-fatal.
    }
  }

  async handleUpdate(update: TelegramUpdate): Promise<void> {
    const message = update?.message;
    if (!message?.chat?.id) return;
    const chatId = message.chat.id;
    const text = (message.text ?? '').trim();

    // Per-chat rate limit.
    const existing = this.conversations.get(chatId);
    const now = Date.now();
    if (existing && now - existing.lastAt < RATE_LIMIT_MS) {
      return;
    }

    if (text.startsWith('/start')) {
      await this.handleStart(chatId, text);
      return;
    }
    if (text === '/cancel' || text === BTN_CANCEL) {
      this.conversations.delete(chatId);
      await this.send(
        chatId,
        'Cancelled. Tap the button below or send /start to begin again.',
        KB_APPLY,
      );
      return;
    }
    // "Apply as institution" reply-keyboard button behaves like a bare /start.
    if (text === BTN_APPLY) {
      await this.handleStart(chatId, '/start');
      return;
    }

    const convo = this.conversations.get(chatId);
    if (!convo) {
      await this.send(
        chatId,
        'Tap <b>🏫 Apply as institution</b> below to start a partner application, or use your center’s join link to sign up as a student.',
        KB_APPLY,
      );
      return;
    }
    convo.lastAt = now;

    if (convo.flow === 'institution') {
      await this.stepInstitution(chatId, convo, text);
    } else {
      await this.stepStudent(chatId, convo, text);
    }
  }

  private async handleStart(chatId: number, text: string): Promise<void> {
    const payload = text.split(/\s+/)[1] ?? '';
    const now = Date.now();

    if (payload.startsWith('inst_')) {
      const institutionId = payload.slice('inst_'.length);
      const institution = await this.prisma.institution.findUnique({
        where: { id: institutionId },
      });
      if (!institution || institution.status !== InstitutionStatus.ACTIVE) {
        await this.send(
          chatId,
          'This center is not available for sign-up right now. Please check with your center.',
          KB_REMOVE,
        );
        return;
      }
      this.conversations.set(chatId, {
        flow: 'student',
        step: 0,
        institutionId,
        data: {},
        lastAt: now,
      });
      await this.send(
        chatId,
        `Welcome! You’re signing up with <b>${institution.name}</b>.\n\nWhat is your full name?`,
        KB_CANCEL,
      );
      return;
    }

    this.conversations.set(chatId, {
      flow: 'institution',
      step: 0,
      data: {},
      lastAt: now,
    });
    await this.send(
      chatId,
      'Welcome to iTestU for Institutions.\n\nLet’s set up your partner application. What is your center’s name?\n\n(Tap ❌ Cancel anytime to stop.)',
      KB_CANCEL,
    );
  }

  // ─── Institution application flow ────────────────────────────────────────

  private async stepInstitution(
    chatId: number,
    convo: Conversation,
    text: string,
  ): Promise<void> {
    switch (convo.step) {
      case 0:
        if (text.length < 2) {
          await this.send(chatId, 'Please enter a valid center name.');
          return;
        }
        convo.data.name = text;
        convo.step = 1;
        await this.send(chatId, 'Great. What is the contact person’s full name?');
        return;
      case 1:
        convo.data.contactName = text;
        convo.step = 2;
        await this.send(chatId, 'What is the best contact email?');
        return;
      case 2: {
        if (!EMAIL_RE.test(text)) {
          await this.send(chatId, 'That doesn’t look like a valid email. Try again.');
          return;
        }
        const email = text.trim().toLowerCase();
        // Fail fast: the owner account is created fresh on approval, so the
        // email must not already belong to a user, and must not duplicate an
        // existing application. Checking here avoids doomed approvals later.
        const [userClash, appClash] = await Promise.all([
          this.prisma.user.findUnique({ where: { email }, select: { id: true } }),
          this.prisma.institution.findFirst({
            where: { contactEmail: email },
            select: { id: true },
          }),
        ]);
        if (userClash) {
          await this.send(
            chatId,
            'That email is already registered on iTestU. Please enter a different email for the centre owner account.',
          );
          return; // stay on this step
        }
        if (appClash) {
          this.conversations.delete(chatId);
          await this.send(
            chatId,
            'An application with this email already exists. We’ll be in touch soon.',
            KB_REMOVE,
          );
          return;
        }
        convo.data.contactEmail = email;
        convo.step = 3;
        await this.send(chatId, 'Contact phone number?');
        return;
      }
      case 3:
        convo.data.contactPhone = text;
        convo.step = 4;
        await this.send(chatId, 'Which city is your center in?');
        return;
      case 4:
        convo.data.city = text;
        await this.finishInstitution(chatId, convo);
        return;
      default:
        this.conversations.delete(chatId);
        await this.send(chatId, 'Something went wrong. Send /start to try again.');
    }
  }

  private async finishInstitution(
    chatId: number,
    convo: Conversation,
  ): Promise<void> {
    const { name, contactName, contactEmail, contactPhone, city } = convo.data;

    const [existing, userClash] = await Promise.all([
      this.prisma.institution.findFirst({ where: { contactEmail } }),
      this.prisma.user.findUnique({
        where: { email: contactEmail },
        select: { id: true },
      }),
    ]);
    if (userClash) {
      this.conversations.delete(chatId);
      await this.send(
        chatId,
        'That email is already registered on iTestU. Please send /start to apply again with a different owner email.',
        KB_REMOVE,
      );
      return;
    }
    if (existing) {
      this.conversations.delete(chatId);
      await this.send(
        chatId,
        'An application with this email already exists. We’ll be in touch soon.',
        KB_REMOVE,
      );
      return;
    }

    const slug = await this.uniqueSlug(name);
    const institution = await this.prisma.institution.create({
      data: {
        name,
        slug,
        status: InstitutionStatus.PENDING,
        city,
        contactName,
        contactEmail,
        contactPhone,
        telegramChatId: String(chatId),
      },
    });

    await this.audit.log({
      action: AuditAction.INSTITUTION_APPLICATION,
      entity: 'institution',
      entityId: institution.id,
      metadata: { source: 'telegram', contactEmail },
    });

    this.conversations.delete(chatId);
    await this.send(
      chatId,
      `Thank you! Your application for <b>${name}</b> has been received. Our team will review it and email <b>${contactEmail}</b> with next steps once approved.`,
      KB_REMOVE,
    );
  }

  // ─── Student join flow ───────────────────────────────────────────────────

  private async stepStudent(
    chatId: number,
    convo: Conversation,
    text: string,
  ): Promise<void> {
    switch (convo.step) {
      case 0:
        if (text.length < 2) {
          await this.send(chatId, 'Please enter your full name.');
          return;
        }
        convo.data.name = text;
        convo.step = 1;
        await this.send(chatId, 'Thanks. What is your email address?');
        return;
      case 1:
        if (!EMAIL_RE.test(text)) {
          await this.send(chatId, 'That doesn’t look like a valid email. Try again.');
          return;
        }
        convo.data.email = text.toLowerCase();
        await this.finishStudent(chatId, convo);
        return;
      default:
        this.conversations.delete(chatId);
        await this.send(chatId, 'Something went wrong. Please use your center’s link again.');
    }
  }

  private async finishStudent(
    chatId: number,
    convo: Conversation,
  ): Promise<void> {
    const { name, email } = convo.data;
    const institutionId = convo.institutionId!;

    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
    });
    if (!institution) {
      this.conversations.delete(chatId);
      await this.send(chatId, 'This center is no longer available.', KB_REMOVE);
      return;
    }

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      this.conversations.delete(chatId);
      await this.send(
        chatId,
        'An account with this email already exists. Please sign in at ' +
          `${this.appUrl()}/login`,
        KB_REMOVE,
      );
      return;
    }

    const rawToken = randomBytes(32).toString('hex');
    const passwordResetToken = createHash('sha256').update(rawToken).digest('hex');
    const passwordResetExpires = new Date(Date.now() + SETUP_TOKEN_TTL_MS);
    const passwordHash = await bcrypt.hash(randomBytes(16).toString('hex'), 12);

    await this.prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        role: UserRole.STUDENT,
        institutionId,
        passwordResetToken,
        passwordResetExpires,
        studentProfile: {
          create: {
            institutionId,
            institutionStatus: InstitutionMemberStatus.PENDING,
          },
        },
      },
    });

    const setupUrl = `${this.appUrl()}/reset-password?token=${rawToken}`;
    void this.mail
      .sendInstitutionStudentInviteEmail(email, name, institution.name, setupUrl)
      .catch(() => undefined);

    this.conversations.delete(chatId);
    await this.send(
      chatId,
      `You’re almost done! We’ve emailed <b>${email}</b> a link to verify your account and set a password. Once <b>${institution.name}</b> approves you, you can start booking mocks.`,
      KB_REMOVE,
    );
  }

  private async uniqueSlug(name: string): Promise<string> {
    const base =
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 40) || 'center';
    let slug = base;
    for (let i = 0; i < 5; i++) {
      const clash = await this.prisma.institution.findUnique({ where: { slug } });
      if (!clash) return slug;
      slug = `${base}-${randomBytes(2).toString('hex')}`;
    }
    return `${base}-${randomBytes(4).toString('hex')}`;
  }
}
