import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  InstitutionMemberStatus,
  InstitutionStatus,
  UserRole,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import * as dns from 'dns';
import { AuditAction } from '../../common/audit/audit.actions';
import { AuditService } from '../../common/audit/audit.service';
import { submitInstitutionApplication } from '../../common/institution/institution-applications';
import { notifyAdminsOfInstitutionApplication } from '../../common/institution/notify-admins';
import { MailService } from '../../common/mail/mail.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

// This VPS resolves api.telegram.org to a dead IPv6 first; prefer IPv4 so
// outbound Bot API calls don't hang then die with "fetch failed".
dns.setDefaultResultOrder('ipv4first');

const SETUP_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const RATE_LIMIT_MS = 700;
const TELEGRAM_TIMEOUT_MS = 8_000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[\d\s().-]{7,20}$/;
/** Marketplace mock-feedback channel only — never used as a default for other sends. */
const DEFAULT_TELEGRAM_FEEDBACK_CHANNEL_ID = '-1004413242735';
const TELEGRAM_CHAT_ID_RE = /^-?\d+$/;

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
    private notifications: NotificationsService,
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

  private errDetail(err: unknown): string {
    if (!(err instanceof Error)) return String(err);
    const cause = (err as Error & { cause?: unknown }).cause;
    return cause instanceof Error
      ? `${err.message} (${cause.message})`
      : err.message;
  }

  /**
   * Low-level Telegram Bot API call with a hard timeout and one retry.
   * Returns the parsed JSON body, or null on total failure.
   */
  private async telegramCall(
    method: string,
    body?: Record<string, unknown>,
    retries = 1,
  ): Promise<{ ok?: boolean; result?: unknown; description?: string } | null> {
    const token = this.token();
    if (!token) return null;

    let lastErr: unknown;
    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TELEGRAM_TIMEOUT_MS);
      try {
        const res = await fetch(
          `https://api.telegram.org/bot${token}/${method}`,
          {
            method: body ? 'POST' : 'GET',
            headers: body ? { 'Content-Type': 'application/json' } : undefined,
            body: body ? JSON.stringify(body) : undefined,
            signal: controller.signal,
          },
        );
        const data = (await res.json()) as {
          ok?: boolean;
          result?: unknown;
          description?: string;
        };
        if (!data.ok) {
          this.logger.warn(
            `Telegram ${method}: ${data.description ?? `HTTP ${res.status}`}`,
          );
        }
        return data;
      } catch (err) {
        lastErr = err;
        this.logger.warn(
          `Telegram ${method} attempt ${attempt + 1} failed: ${this.errDetail(err)}`,
        );
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 350));
        }
      } finally {
        clearTimeout(timer);
      }
    }
    this.logger.error(
      `Telegram ${method} failed: ${this.errDetail(lastErr)}`,
    );
    return null;
  }

  /**
   * Resolve the mock-feedback channel id from env (never a shared ops default).
   * Other Telegram destinations must pass an explicit chat id.
   */
  feedbackChannelId(): string {
    return (
      this.config.get<string>('TELEGRAM_FEEDBACK_CHANNEL_ID')?.trim() ||
      DEFAULT_TELEGRAM_FEEDBACK_CHANNEL_ID
    );
  }

  /**
   * Post to the dedicated mock-feedback channel only
   * (`TELEGRAM_FEEDBACK_CHANNEL_ID`, default `-1004413242735`).
   * Never falls back to applicant DMs or any other chat.
   * Failures are logged and return false — never throws.
   */
  async sendToFeedbackChannel(text: string): Promise<boolean> {
    return this.notifyChat(this.feedbackChannelId(), text);
  }

  /**
   * Send to an explicit chat id (applicant DM, institution.telegramChatId, etc.).
   * Callers must supply the destination — this never reads TELEGRAM_FEEDBACK_CHANNEL_ID.
   * Failures are logged and return false — never throws.
   */
  async notifyChat(
    chatId: string | number,
    text: string,
    replyMarkup?: unknown,
  ): Promise<boolean> {
    try {
      const id = this.normalizeChatId(chatId);
      if (id == null) return false;
      const messageId = await this.send(id, text, replyMarkup);
      return messageId != null;
    } catch (err) {
      this.logger.warn(
        `Telegram notifyChat failed: ${this.errDetail(err)}`,
      );
      return false;
    }
  }

  /** Alias for applicant approve/reject DMs — explicit chat id required. */
  async notifyApplicant(
    chatId: string | number,
    text: string,
  ): Promise<boolean> {
    return this.notifyChat(chatId, text);
  }

  private normalizeChatId(chatId: string | number): string | number | null {
    if (typeof chatId === 'number') {
      return Number.isFinite(chatId) ? chatId : null;
    }
    const trimmed = chatId.trim();
    if (!TELEGRAM_CHAT_ID_RE.test(trimmed)) return null;
    // Keep as string so large channel ids stay exact for the Bot API.
    return trimmed;
  }

  /** Show the native "typing…" indicator so the user knows we received them. */
  private async sendTyping(chatId: number): Promise<void> {
    try {
      await this.telegramCall('sendChatAction', {
        chat_id: chatId,
        action: 'typing',
      }, 0);
    } catch {
      /* best-effort UX hint */
    }
  }

  /** Sends a message; returns Telegram message_id (or null). Never throws. */
  private async send(
    chatId: string | number,
    text: string,
    replyMarkup?: unknown,
  ): Promise<number | null> {
    if (!this.token()) {
      this.logger.warn(`Telegram not configured — message to ${chatId}: ${text}`);
      return null;
    }
    try {
      const data = await this.telegramCall('sendMessage', {
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
      });
      const result = data?.result as { message_id?: number } | undefined;
      return result?.message_id ?? null;
    } catch (err) {
      this.logger.warn(
        `Telegram sendMessage to ${chatId} failed: ${this.errDetail(err)}`,
      );
      return null;
    }
  }

  private async deleteMessage(
    chatId: number,
    messageId: number,
  ): Promise<void> {
    try {
      await this.telegramCall(
        'deleteMessage',
        { chat_id: chatId, message_id: messageId },
        0,
      );
    } catch {
      /* best-effort cleanup */
    }
  }

  /**
   * Instant UX while we do a DB lookup: typing indicator + a short status
   * message (⏳). Caller should delete the status message when done.
   */
  private async beginCheck(
    chatId: number,
    label = '⏳ Checking that email…',
  ): Promise<number | null> {
    await this.sendTyping(chatId);
    return this.send(chatId, label);
  }

  private async endCheck(
    chatId: number,
    statusMessageId: number | null,
  ): Promise<void> {
    if (statusMessageId != null) {
      await this.deleteMessage(chatId, statusMessageId);
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
    await this.telegramCall('getMe', undefined, 0);
  }

  /** Long-poll for updates (dev mode — no public webhook required). */
  async getUpdates(offset: number, timeoutSec = 25): Promise<TelegramUpdate[]> {
    const token = this.token();
    if (!token) return [];
    const controller = new AbortController();
    // Long poll itself needs longer than TELEGRAM_TIMEOUT_MS.
    const timer = setTimeout(
      () => controller.abort(),
      (timeoutSec + 5) * 1000,
    );
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${token}/getUpdates?timeout=${timeoutSec}&offset=${offset}`,
        { signal: controller.signal },
      );
      if (!res.ok) throw new Error(`getUpdates HTTP ${res.status}`);
      const body = (await res.json()) as {
        ok: boolean;
        result?: TelegramUpdate[];
      };
      return body.result ?? [];
    } finally {
      clearTimeout(timer);
    }
  }

  /** Registers the webhook with Telegram (production). Returns success. */
  async setWebhook(url: string, secret?: string): Promise<boolean> {
    const data = await this.telegramCall('setWebhook', {
      url,
      secret_token: secret || undefined,
      allowed_updates: ['message'],
    });
    return data?.ok === true;
  }

  /** Removes any registered webhook so getUpdates (polling) can run. */
  async deleteWebhook(): Promise<void> {
    await this.telegramCall('deleteWebhook', { drop_pending_updates: false }, 0);
  }

  /** Registers the command menu so the Telegram "Menu" button lists commands. */
  async registerCommands(): Promise<void> {
    await this.telegramCall(
      'setMyCommands',
      {
        commands: [
          { command: 'start', description: 'Start / apply as an institution' },
          { command: 'cancel', description: 'Cancel the current step' },
        ],
      },
      0,
    );
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
        if (text.length < 2) {
          await this.send(chatId, 'Please enter the contact person’s full name.');
          return;
        }
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
        const statusId = await this.beginCheck(chatId);
        const userClash = await this.prisma.user.findUnique({
          where: { email },
          select: { id: true },
        });
        await this.endCheck(chatId, statusId);
        if (userClash) {
          await this.send(
            chatId,
            'That email is already registered on iTestU. Please enter a different email for the centre owner account.',
          );
          return;
        }
        convo.data.contactEmail = email;
        convo.step = 3;
        await this.send(chatId, 'Contact phone number?');
        return;
      }
      case 3:
        if (!PHONE_RE.test(text)) {
          await this.send(
            chatId,
            'Please enter a valid phone number (e.g. +998901234567).',
          );
          return;
        }
        convo.data.contactPhone = text;
        convo.step = 4;
        await this.send(chatId, 'Which city is your center in?');
        return;
      case 4:
        if (text.length < 2) {
          await this.send(chatId, 'Please enter your center’s city.');
          return;
        }
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

    const statusId = await this.beginCheck(chatId, '⏳ Submitting your application…');
    const userClash = await this.prisma.user.findUnique({
      where: { email: contactEmail },
      select: { id: true },
    });
    if (userClash) {
      await this.endCheck(chatId, statusId);
      this.conversations.delete(chatId);
      await this.send(
        chatId,
        'That email is already registered on iTestU. Please send /start to apply again with a different owner email.',
        KB_REMOVE,
      );
      return;
    }

    const slug = await this.uniqueSlug(name);
    const result = await submitInstitutionApplication(this.prisma, {
      name,
      slug,
      contactName,
      contactEmail,
      contactPhone,
      city,
      telegramChatId: String(chatId),
    });

    if (result.kind === 'duplicate_pending') {
      await this.endCheck(chatId, statusId);
      this.conversations.delete(chatId);
      await this.send(
        chatId,
        'An application with this email is already being reviewed. We’ll be in touch soon.',
        KB_REMOVE,
      );
      return;
    }
    if (result.kind === 'duplicate_active') {
      await this.endCheck(chatId, statusId);
      this.conversations.delete(chatId);
      await this.send(
        chatId,
        'This email is already linked to a partner centre on iTestU.',
        KB_REMOVE,
      );
      return;
    }

    await this.audit.log({
      action: AuditAction.INSTITUTION_APPLICATION,
      entity: 'institution',
      entityId: result.institutionId,
      metadata: { source: 'telegram', contactEmail },
    });

    void notifyAdminsOfInstitutionApplication(
      this.prisma,
      this.notifications,
      name,
      contactEmail,
      'telegram',
    ).catch(() => undefined);

    await this.endCheck(chatId, statusId);
    this.conversations.delete(chatId);
    const reopened = result.kind === 'reopened';
    await this.send(
      chatId,
      reopened
        ? `Welcome back! Your updated application for <b>${name}</b> has been resubmitted. Our team will review it and email <b>${contactEmail}</b> with next steps once approved.`
        : `Thank you! Your application for <b>${name}</b> has been received. Our team will review it and email <b>${contactEmail}</b> with next steps once approved.`,
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
      case 1: {
        if (!EMAIL_RE.test(text)) {
          await this.send(chatId, 'That doesn’t look like a valid email. Try again.');
          return;
        }
        const email = text.trim().toLowerCase();
        const statusId = await this.beginCheck(chatId);
        const existing = await this.prisma.user.findUnique({
          where: { email },
          select: { id: true },
        });
        await this.endCheck(chatId, statusId);
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
        convo.data.email = email;
        await this.finishStudent(chatId, convo);
        return;
      }
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

    const statusId = await this.beginCheck(
      chatId,
      '⏳ Setting up your account…',
    );

    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      select: { id: true, name: true },
    });
    if (!institution) {
      await this.endCheck(chatId, statusId);
      this.conversations.delete(chatId);
      await this.send(chatId, 'This center is no longer available.', KB_REMOVE);
      return;
    }

    const existing = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing) {
      await this.endCheck(chatId, statusId);
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

    await this.endCheck(chatId, statusId);
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
