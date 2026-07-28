import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TechIssueStatus, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as dns from 'dns';
import { isMainAdminEmail } from '../../common/admin-permissions/admin-permissions';
import { PrismaService } from '../../prisma/prisma.service';

// Prefer IPv4 — same VPS quirk as the onboarding bot.
dns.setDefaultResultOrder('ipv4first');

const TELEGRAM_TIMEOUT_MS = 8_000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const RATE_LIMIT_MS = 700;
const LOGIN_FAIL_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_FAIL_MAX = 5;
const MEDIA_GROUP_WAIT_MS = 800;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TELEGRAM_CHAT_ID_RE = /^-?\d+$/;

type WizardStep =
  | 'email'
  | 'password'
  | 'ask_image'
  | 'await_photos'
  | 'cant_reason';

interface Wizard {
  step: WizardStep;
  email?: string;
  issueCode?: string;
  /** Draft issue text while choosing / collecting photos. */
  issueText?: string;
  photos?: string[];
  lastAt: number;
}

interface MediaGroupDraft {
  chatId: number;
  userId: string;
  photos: string[];
  caption?: string;
  timer: ReturnType<typeof setTimeout>;
}

interface TelegramPhotoSize {
  file_id: string;
  width?: number;
  height?: number;
}

interface TelegramMessage {
  message_id?: number;
  chat: { id: number; type?: string };
  from?: { id: number; first_name?: string; username?: string };
  text?: string;
  caption?: string;
  photo?: TelegramPhotoSize[];
  media_group_id?: string;
}

interface TelegramCallbackQuery {
  id: string;
  from: { id: number; first_name?: string; username?: string };
  message?: {
    message_id?: number;
    chat: { id: number };
  };
  data?: string;
}

export interface TechIssuesTelegramUpdate {
  update_id?: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

@Injectable()
export class TechIssuesTelegramService {
  private readonly logger = new Logger(TechIssuesTelegramService.name);
  private readonly wizards = new Map<number, Wizard>();
  private readonly loginFailures = new Map<
    number,
    { count: number; windowStart: number }
  >();
  private readonly mediaGroups = new Map<string, MediaGroupDraft>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  isConfigured(): boolean {
    return Boolean(
      this.config.get<string>('TELEGRAM_TECH_ISSUES_BOT_TOKEN')?.trim(),
    );
  }

  channelId(): string {
    return (
      this.config.get<string>('TELEGRAM_TECH_ISSUES_CHANNEL_ID')?.trim() ||
      '-1003941044424'
    );
  }

  verifySecret(headerSecret?: string): boolean {
    const secret = this.config
      .get<string>('TELEGRAM_TECH_ISSUES_WEBHOOK_SECRET')
      ?.trim();
    if (!secret) return true;
    return headerSecret === secret;
  }

  private token(): string | undefined {
    return (
      this.config.get<string>('TELEGRAM_TECH_ISSUES_BOT_TOKEN')?.trim() ||
      undefined
    );
  }

  private errDetail(err: unknown): string {
    if (!(err instanceof Error)) return String(err);
    const cause = (err as Error & { cause?: unknown }).cause;
    return cause instanceof Error
      ? `${err.message} (${cause.message})`
      : err.message;
  }

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
            `TechIssues Telegram ${method}: ${data.description ?? `HTTP ${res.status}`}`,
          );
        }
        return data;
      } catch (err) {
        lastErr = err;
        this.logger.warn(
          `TechIssues Telegram ${method} attempt ${attempt + 1} failed: ${this.errDetail(err)}`,
        );
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 350));
        }
      } finally {
        clearTimeout(timer);
      }
    }
    this.logger.error(
      `TechIssues Telegram ${method} failed: ${this.errDetail(lastErr)}`,
    );
    return null;
  }

  async warmUp(): Promise<void> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      /* best-effort */
    }
    await this.telegramCall('getMe', undefined, 0);
  }

  async getUpdates(
    offset: number,
    timeoutSec = 25,
  ): Promise<TechIssuesTelegramUpdate[]> {
    const token = this.token();
    if (!token) return [];
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      (timeoutSec + 5) * 1000,
    );
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${token}/getUpdates?timeout=${timeoutSec}&offset=${offset}&allowed_updates=${encodeURIComponent(JSON.stringify(['message', 'callback_query']))}`,
        { signal: controller.signal },
      );
      if (!res.ok) throw new Error(`getUpdates HTTP ${res.status}`);
      const body = (await res.json()) as {
        ok: boolean;
        result?: TechIssuesTelegramUpdate[];
      };
      return body.result ?? [];
    } finally {
      clearTimeout(timer);
    }
  }

  async setWebhook(url: string, secret?: string): Promise<boolean> {
    const data = await this.telegramCall('setWebhook', {
      url,
      secret_token: secret || undefined,
      allowed_updates: ['message', 'callback_query'],
      drop_pending_updates: false,
    });
    return data?.ok === true;
  }

  async getWebhookInfo(): Promise<{ url?: string; pending_update_count?: number } | null> {
    const data = await this.telegramCall('getWebhookInfo', undefined, 0);
    if (!data?.ok || !data.result || typeof data.result !== 'object') return null;
    return data.result as { url?: string; pending_update_count?: number };
  }

  async deleteWebhook(): Promise<void> {
    await this.telegramCall(
      'deleteWebhook',
      { drop_pending_updates: false },
      0,
    );
  }

  async registerCommands(): Promise<void> {
    await this.telegramCall(
      'setMyCommands',
      {
        commands: [
          { command: 'start', description: 'Welcome / how to use' },
          { command: 'login', description: 'Sign in as platform admin' },
          { command: 'logout', description: 'Sign out' },
          { command: 'issues', description: 'Pending issues (status controls)' },
          { command: 'myissues', description: 'List your tech issues' },
          { command: 'cancel', description: 'Cancel current step' },
        ],
      },
      0,
    );
  }

  /** Boot smoke-test: post (then delete) a short ping in the tech channel. */
  async sendChannelSmokeTest(): Promise<boolean> {
    const channel = this.channelId();
    const data = await this.telegramCall('sendMessage', {
      chat_id: channel,
      text: '✅ Tech-issues bot online (deploy verify).',
      parse_mode: 'HTML',
    });
    const messageId = (data?.result as { message_id?: number } | undefined)
      ?.message_id;
    if (messageId != null) {
      await this.telegramCall(
        'deleteMessage',
        { chat_id: channel, message_id: messageId },
        0,
      );
      return true;
    }
    return data?.ok === true;
  }

  private async send(
    chatId: string | number,
    text: string,
    replyMarkup?: unknown,
  ): Promise<number | null> {
    if (!this.token()) {
      this.logger.warn(
        `Tech-issues bot not configured — message to ${chatId}: ${text}`,
      );
      return null;
    }
    const data = await this.telegramCall('sendMessage', {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    });
    return (data?.result as { message_id?: number } | undefined)?.message_id ?? null;
  }

  private async editMessage(
    chatId: string | number,
    messageId: number | string,
    text: string,
    replyMarkup?: unknown,
  ): Promise<boolean> {
    const data = await this.telegramCall('editMessageText', {
      chat_id: chatId,
      message_id: Number(messageId),
      text,
      parse_mode: 'HTML',
      ...(replyMarkup !== undefined ? { reply_markup: replyMarkup } : {}),
    });
    return data?.ok === true;
  }

  private emptyKeyboard() {
    return { inline_keyboard: [] as unknown[][] };
  }

  private async sendPhoto(
    chatId: string | number,
    fileId: string,
    caption?: string,
    replyToMessageId?: number,
  ): Promise<void> {
    await this.telegramCall('sendPhoto', {
      chat_id: chatId,
      photo: fileId,
      ...(caption ? { caption, parse_mode: 'HTML' } : {}),
      ...(replyToMessageId != null
        ? { reply_to_message_id: replyToMessageId }
        : {}),
    });
  }

  private async answerCallback(
    callbackQueryId: string,
    text?: string,
    showAlert = false,
  ): Promise<void> {
    await this.telegramCall(
      'answerCallbackQuery',
      {
        callback_query_id: callbackQueryId,
        ...(text ? { text, show_alert: showAlert } : {}),
      },
      0,
    );
  }

  private async isChannelAdmin(telegramUserId: number): Promise<boolean> {
    const data = await this.telegramCall(
      'getChatMember',
      {
        chat_id: this.channelId(),
        user_id: telegramUserId,
      },
      0,
    );
    const status = (data?.result as { status?: string } | undefined)?.status;
    return status === 'creator' || status === 'administrator';
  }

  private statusLabel(status: TechIssueStatus): string {
    switch (status) {
      case TechIssueStatus.PENDING:
        return 'Pending';
      case TechIssueStatus.RESOLVED:
        return 'Resolved';
      case TechIssueStatus.CANT:
        return "Can't";
      default:
        return status;
    }
  }

  private statusKeyboard(code: string) {
    return {
      inline_keyboard: [
        [
          { text: 'Pending', callback_data: `ti:PENDING:${code}` },
          { text: 'Resolved', callback_data: `ti:RESOLVED:${code}` },
          { text: "Can't", callback_data: `ti:CANT:${code}` },
        ],
      ],
    };
  }

  private imageChoiceKeyboard() {
    return {
      inline_keyboard: [
        [
          { text: '📷 Add image', callback_data: 'ti:img:add' },
          { text: '⏭ Skip', callback_data: 'ti:img:skip' },
        ],
      ],
    };
  }

  private photoSendKeyboard() {
    return {
      inline_keyboard: [
        [
          { text: '✅ Send', callback_data: 'ti:img:send' },
          { text: '⏭ Skip photos', callback_data: 'ti:img:skip' },
        ],
      ],
    };
  }

  private formatChannelMessage(opts: {
    code: string;
    status: TechIssueStatus;
    reporterName: string;
    reporterEmail: string;
    message: string;
    cantReason?: string | null;
  }): string {
    const lines = [
      `<b>🛠 Tech Issue ${opts.code}</b>`,
      `<b>Status:</b> ${this.statusLabel(opts.status)}`,
      `<b>Reporter:</b> ${this.escapeHtml(opts.reporterName)} (${this.escapeHtml(opts.reporterEmail)})`,
      '',
      this.escapeHtml(opts.message),
    ];
    if (opts.status === TechIssueStatus.CANT && opts.cantReason) {
      lines.push('', `<b>Reason:</b> ${this.escapeHtml(opts.cantReason)}`);
    }
    return lines.join('\n');
  }

  private formatControlMessage(opts: {
    code: string;
    status: TechIssueStatus;
    message: string;
    cantReason?: string | null;
  }): string {
    const lines = [
      `<b>Status controls — ${opts.code}</b>`,
      `<b>Status:</b> ${this.statusLabel(opts.status)}`,
      '',
      this.escapeHtml(opts.message.slice(0, 400)) +
        (opts.message.length > 400 ? '…' : ''),
      '',
      'Only tech-issues channel admins can change status.',
    ];
    if (opts.status === TechIssueStatus.CANT && opts.cantReason) {
      lines.splice(
        2,
        0,
        `<b>Reason:</b> ${this.escapeHtml(opts.cantReason)}`,
      );
    }
    return lines.join('\n');
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  private async generateCode(): Promise<string> {
    const count = await this.prisma.techIssue.count();
    let n = count + 1;
    for (let i = 0; i < 1000; i++, n++) {
      const code = `TI-${String(n).padStart(4, '0')}`;
      const exists = await this.prisma.techIssue.findUnique({
        where: { code },
        select: { id: true },
      });
      if (!exists) return code;
    }
    return `TI-${Date.now().toString(36).toUpperCase()}`;
  }

  private async getSession(chatId: number) {
    const session = await this.prisma.telegramAdminSession.findUnique({
      where: { telegramChatId: String(chatId) },
      include: {
        user: {
          include: { adminProfile: true },
        },
      },
    });
    if (!session) return null;
    if (session.expiresAt.getTime() <= Date.now()) {
      await this.prisma.telegramAdminSession.delete({
        where: { id: session.id },
      });
      return null;
    }
    if (session.user.role !== UserRole.ADMIN) {
      await this.prisma.telegramAdminSession.delete({
        where: { id: session.id },
      });
      return null;
    }
    if (!this.adminCanUseBot(session.user)) {
      await this.prisma.telegramAdminSession.delete({
        where: { id: session.id },
      });
      return null;
    }
    return session;
  }

  private adminCanUseBot(user: {
    email: string;
    role: UserRole;
    emailVerifiedAt?: Date | null;
    adminProfile?: { active: boolean } | null;
  }): boolean {
    if (user.role !== UserRole.ADMIN) return false;
    if (isMainAdminEmail(user.email, this.config.get('MAIN_ADMIN_EMAIL'))) {
      return true;
    }
    if (user.adminProfile && !user.adminProfile.active) return false;
    if (!user.emailVerifiedAt) return false;
    return true;
  }

  private loginBlocked(chatId: number): boolean {
    const entry = this.loginFailures.get(chatId);
    if (!entry) return false;
    if (Date.now() - entry.windowStart > LOGIN_FAIL_WINDOW_MS) {
      this.loginFailures.delete(chatId);
      return false;
    }
    return entry.count >= LOGIN_FAIL_MAX;
  }

  private recordLoginFailure(chatId: number): void {
    const now = Date.now();
    const entry = this.loginFailures.get(chatId);
    if (!entry || now - entry.windowStart > LOGIN_FAIL_WINDOW_MS) {
      this.loginFailures.set(chatId, { count: 1, windowStart: now });
      return;
    }
    entry.count += 1;
  }

  private clearLoginFailures(chatId: number): void {
    this.loginFailures.delete(chatId);
  }

  async handleUpdate(update: TechIssuesTelegramUpdate): Promise<void> {
    if (update.callback_query) {
      await this.handleCallback(update.callback_query);
      return;
    }
    const message = update.message;
    if (!message?.chat?.id) return;
    // Ignore channel posts / group noise — only DMs for issue submission.
    if (message.chat.type && message.chat.type !== 'private') return;

    const chatId = message.chat.id;
    const text = (message.text ?? '').trim();
    const cmd = text.split(/\s+/)[0]?.split('@')[0] ?? '';
    const isCommand = cmd.startsWith('/');

    const wizard = this.wizards.get(chatId);
    const now = Date.now();
    // Never silently drop slash-commands — only rate-limit wizard text/photos.
    if (!isCommand && wizard && now - wizard.lastAt < RATE_LIMIT_MS) return;
    if (wizard) wizard.lastAt = now;

    if (cmd === '/start') {
      await this.handleStart(chatId);
      return;
    }
    if (cmd === '/login') {
      await this.beginLogin(chatId);
      return;
    }
    if (cmd === '/logout') {
      await this.handleLogout(chatId);
      return;
    }
    if (cmd === '/issues') {
      await this.handlePendingIssues(chatId);
      return;
    }
    if (cmd === '/myissues') {
      await this.handleMyIssues(chatId);
      return;
    }
    if (cmd === '/cancel') {
      this.wizards.delete(chatId);
      await this.send(
        chatId,
        'Cancelled. Send /login to sign in or describe an issue if already signed in.',
      );
      return;
    }

    if (wizard?.step === 'email') {
      await this.handleEmailStep(chatId, text);
      return;
    }
    if (wizard?.step === 'password') {
      await this.handlePasswordStep(chatId, text);
      return;
    }
    if (wizard?.step === 'cant_reason') {
      await this.handleCantReason(chatId, text, wizard);
      return;
    }
    if (wizard?.step === 'ask_image') {
      await this.send(
        chatId,
        'Use the buttons below: <b>Add image</b> or <b>Skip</b>. Or /cancel.',
        this.imageChoiceKeyboard(),
      );
      return;
    }
    if (wizard?.step === 'await_photos') {
      if (message.photo?.length) {
        const session = await this.getSession(chatId);
        if (!session) {
          this.wizards.delete(chatId);
          await this.send(
            chatId,
            'You are not signed in. Send /login and authenticate with your platform admin email and password.',
          );
          return;
        }
        await this.handlePhotoDuringAwait(chatId, session.userId, message);
        return;
      }
      await this.send(
        chatId,
        'Send photo(s) now, then tap <b>Send</b>. Or tap <b>Skip photos</b> / /cancel.',
        this.photoSendKeyboard(),
      );
      return;
    }

    const session = await this.getSession(chatId);
    if (!session) {
      await this.send(
        chatId,
        'You are not signed in. Send /login and authenticate with your platform admin email and password.',
      );
      return;
    }

    if (message.photo?.length) {
      await this.send(
        chatId,
        'Send the issue <b>text</b> first. You will then be asked whether to add an image.',
      );
      return;
    }

    if (!text) {
      await this.send(
        chatId,
        'Send your tech issue as text. You will then choose Add image or Skip.\n\nCommands: /issues · /myissues · /logout · /cancel',
      );
      return;
    }

    await this.beginIssueImageStep(chatId, text);
  }

  private async beginIssueImageStep(
    chatId: number,
    issueText: string,
  ): Promise<void> {
    this.wizards.set(chatId, {
      step: 'ask_image',
      issueText,
      photos: [],
      lastAt: Date.now(),
    });
    await this.send(
      chatId,
      [
        'Got your issue text.',
        '',
        `<i>${this.escapeHtml(issueText.slice(0, 300))}${issueText.length > 300 ? '…' : ''}</i>`,
        '',
        '<b>Add an image?</b>',
      ].join('\n'),
      this.imageChoiceKeyboard(),
    );
  }

  private async handleStart(chatId: number): Promise<void> {
    const session = await this.getSession(chatId);
    if (session) {
      await this.send(
        chatId,
        `Authenticated as <b>${this.escapeHtml(session.user.name)}</b>. Send issue text — you will then choose Add image or Skip.\n\nCommands: /issues · /myissues · /logout · /cancel`,
      );
      return;
    }
    await this.send(
      chatId,
      [
        '<b>iTestU admin tech-issues bot</b>',
        '',
        'Report platform tech issues to the ops channel.',
        '',
        '1. Send /login',
        '2. Enter your <b>admin</b> email',
        '3. Enter your password',
        '4. Send the issue text',
        '5. Choose <b>Add image</b> or <b>Skip</b>, then Send',
        '',
        'Commands: /login · /issues · /myissues · /logout · /cancel',
      ].join('\n'),
    );
  }

  private async beginLogin(chatId: number): Promise<void> {
    if (this.loginBlocked(chatId)) {
      await this.send(
        chatId,
        'Too many failed login attempts. Try again in about 15 minutes.',
      );
      return;
    }
    const existing = await this.getSession(chatId);
    if (existing) {
      await this.send(
        chatId,
        `Already authenticated as <b>${this.escapeHtml(existing.user.name)}</b>. Send an issue, or /logout first.`,
      );
      return;
    }
    this.wizards.set(chatId, { step: 'email', lastAt: Date.now() });
    await this.send(chatId, 'Enter your platform admin email:');
  }

  private async handleEmailStep(chatId: number, text: string): Promise<void> {
    const email = text.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) {
      await this.send(chatId, 'That does not look like an email. Try again, or /cancel.');
      return;
    }
    this.wizards.set(chatId, {
      step: 'password',
      email,
      lastAt: Date.now(),
    });
    await this.send(chatId, 'Enter your password:');
  }

  private async handlePasswordStep(
    chatId: number,
    password: string,
  ): Promise<void> {
    const wizard = this.wizards.get(chatId);
    if (!wizard?.email) {
      this.wizards.delete(chatId);
      await this.send(chatId, 'Session expired. Send /login to start again.');
      return;
    }

    if (this.loginBlocked(chatId)) {
      this.wizards.delete(chatId);
      await this.send(
        chatId,
        'Too many failed login attempts. Try again in about 15 minutes.',
      );
      return;
    }

    // Never log the password.
    const user = await this.prisma.user.findUnique({
      where: { email: wizard.email },
      include: { adminProfile: true },
    });

    const passwordOk =
      user != null && (await bcrypt.compare(password, user.passwordHash));
    const allowed = user != null && this.adminCanUseBot(user);

    if (!passwordOk || !allowed) {
      this.recordLoginFailure(chatId);
      this.wizards.delete(chatId);
      await this.send(
        chatId,
        'Authentication failed. Only active platform ADMIN accounts can use this bot. Send /login to try again.',
      );
      return;
    }

    this.clearLoginFailures(chatId);
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await this.prisma.telegramAdminSession.upsert({
      where: { telegramChatId: String(chatId) },
      create: {
        telegramChatId: String(chatId),
        userId: user.id,
        expiresAt,
      },
      update: {
        userId: user.id,
        expiresAt,
      },
    });
    this.wizards.delete(chatId);
    await this.send(
      chatId,
      `Authenticated as <b>${this.escapeHtml(user.name)}</b>. Send issue text — you will then choose Add image or Skip. Send /logout to sign out.`,
    );
  }

  private async handleLogout(chatId: number): Promise<void> {
    this.wizards.delete(chatId);
    await this.prisma.telegramAdminSession.deleteMany({
      where: { telegramChatId: String(chatId) },
    });
    await this.send(chatId, 'Signed out. Send /login to authenticate again.');
  }

  private async handleMyIssues(chatId: number): Promise<void> {
    const session = await this.getSession(chatId);
    if (!session) {
      await this.send(chatId, 'You are not signed in. Send /login first.');
      return;
    }
    const issues = await this.prisma.techIssue.findMany({
      where: { reporterUserId: session.userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    if (!issues.length) {
      await this.send(chatId, 'You have no tech issues yet.');
      return;
    }
    const lines = issues.map(
      (i) =>
        `• <b>${i.code}</b> — ${this.statusLabel(i.status)}\n  ${this.escapeHtml(i.message.slice(0, 120))}${i.message.length > 120 ? '…' : ''}`,
    );
    await this.send(
      chatId,
      `<b>Your recent tech issues</b>\n\n${lines.join('\n\n')}`,
    );
  }

  /** Pending issues with private status controls (channel admins only on click). */
  private async handlePendingIssues(chatId: number): Promise<void> {
    const session = await this.getSession(chatId);
    if (!session) {
      await this.send(chatId, 'You are not signed in. Send /login first.');
      return;
    }

    const isAdmin = await this.isChannelAdmin(chatId);
    if (!isAdmin) {
      await this.send(
        chatId,
        'Only Telegram admins/owners of the tech-issues channel can use /issues status controls. You can still report issues and use /myissues.',
      );
      return;
    }

    const issues = await this.prisma.techIssue.findMany({
      where: { status: TechIssueStatus.PENDING },
      orderBy: { createdAt: 'desc' },
      take: 15,
      include: { reporter: { select: { name: true, email: true } } },
    });
    if (!issues.length) {
      await this.send(chatId, 'No pending tech issues.');
      return;
    }

    await this.send(
      chatId,
      `<b>Pending tech issues</b> (${issues.length})\nTap buttons on each card to update status.`,
    );
    for (const issue of issues) {
      await this.send(
        chatId,
        this.formatControlMessage({
          code: issue.code,
          status: issue.status,
          message: `${issue.reporter.name}: ${issue.message}`,
        }),
        this.statusKeyboard(issue.code),
      );
    }
  }

  private largestPhotoFileId(photos: TelegramPhotoSize[]): string | null {
    if (!photos.length) return null;
    const best = photos.reduce((a, b) => {
      const areaA = (a.width ?? 0) * (a.height ?? 0);
      const areaB = (b.width ?? 0) * (b.height ?? 0);
      return areaB >= areaA ? b : a;
    });
    return best.file_id || null;
  }

  private async handlePhotoDuringAwait(
    chatId: number,
    userId: string,
    message: TelegramMessage,
  ): Promise<void> {
    const fileId = this.largestPhotoFileId(message.photo ?? []);
    if (!fileId) return;

    const wizard = this.wizards.get(chatId);
    if (!wizard || wizard.step !== 'await_photos' || !wizard.issueText) {
      await this.send(
        chatId,
        'Send the issue text first, then choose Add image.',
      );
      return;
    }

    const groupId = message.media_group_id;
    if (groupId) {
      const existing = this.mediaGroups.get(groupId);
      if (existing) {
        existing.photos.push(fileId);
        clearTimeout(existing.timer);
        existing.timer = setTimeout(() => {
          void this.flushMediaGroupIntoWizard(groupId);
        }, MEDIA_GROUP_WAIT_MS);
        return;
      }
      const draft: MediaGroupDraft = {
        chatId,
        userId,
        photos: [fileId],
        timer: setTimeout(() => {
          void this.flushMediaGroupIntoWizard(groupId);
        }, MEDIA_GROUP_WAIT_MS),
      };
      this.mediaGroups.set(groupId, draft);
      return;
    }

    wizard.photos = [...(wizard.photos ?? []), fileId];
    wizard.lastAt = Date.now();
    this.wizards.set(chatId, wizard);
    await this.send(
      chatId,
      `📷 ${wizard.photos.length} photo(s) ready. Send more, or tap <b>Send</b>.`,
      this.photoSendKeyboard(),
    );
  }

  private async flushMediaGroupIntoWizard(groupId: string): Promise<void> {
    const draft = this.mediaGroups.get(groupId);
    if (!draft) return;
    this.mediaGroups.delete(groupId);
    clearTimeout(draft.timer);

    const wizard = this.wizards.get(draft.chatId);
    if (!wizard || wizard.step !== 'await_photos' || !wizard.issueText) {
      return;
    }
    wizard.photos = [...(wizard.photos ?? []), ...draft.photos];
    wizard.lastAt = Date.now();
    this.wizards.set(draft.chatId, wizard);
    await this.send(
      draft.chatId,
      `📷 ${wizard.photos.length} photo(s) ready. Send more, or tap <b>Send</b>.`,
      this.photoSendKeyboard(),
    );
  }

  private async createIssue(opts: {
    chatId: number;
    userId: string;
    message: string;
    photoFileIds: string[];
  }): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: opts.userId },
    });
    if (!user) {
      await this.send(opts.chatId, 'Your session is invalid. Send /login again.');
      return;
    }

    const code = await this.generateCode();
    const issue = await this.prisma.techIssue.create({
      data: {
        code,
        reporterUserId: user.id,
        telegramChatId: String(opts.chatId),
        status: TechIssueStatus.PENDING,
        message: opts.message,
        photoFileIds: opts.photoFileIds.length ? opts.photoFileIds : undefined,
      },
    });

    const channelText = this.formatChannelMessage({
      code: issue.code,
      status: issue.status,
      reporterName: user.name,
      reporterEmail: user.email,
      message: issue.message,
    });

    const channel = this.channelId();
    if (!TELEGRAM_CHAT_ID_RE.test(channel)) {
      this.logger.error('Invalid TELEGRAM_TECH_ISSUES_CHANNEL_ID');
    }

    // Public channel post: text + photos only — NO inline keyboard (visible to all).
    const messageId = await this.send(channel, channelText);

    if (messageId != null) {
      await this.prisma.techIssue.update({
        where: { id: issue.id },
        data: { channelMessageId: String(messageId) },
      });
      for (const fileId of opts.photoFileIds) {
        await this.sendPhoto(channel, fileId, undefined, messageId);
      }
    } else {
      this.logger.warn(
        `Failed to post tech issue ${issue.code} to channel ${channel}`,
      );
    }

    // Private status controls for the submitting admin (and /issues for channel admins).
    await this.send(
      opts.chatId,
      [
        `✅ Issue <b>${issue.code}</b> created. Status: Pending.`,
        '',
        this.escapeHtml(issue.message.slice(0, 500)) +
          (issue.message.length > 500 ? '…' : ''),
        opts.photoFileIds.length
          ? `\n📷 ${opts.photoFileIds.length} photo(s) attached.`
          : '',
        '',
        'Use the buttons below to update status (channel admins only). Or /issues for all pending.',
      ]
        .filter(Boolean)
        .join('\n'),
      this.statusKeyboard(issue.code),
    );
  }

  private async handleCallback(query: TelegramCallbackQuery): Promise<void> {
    const data = query.data?.trim() ?? '';
    const chatId = query.message?.chat?.id ?? query.from.id;

    if (data === 'ti:img:add' || data === 'ti:img:skip' || data === 'ti:img:send') {
      await this.handleImageStepCallback(query, data, chatId);
      return;
    }

    const match = /^ti:(PENDING|RESOLVED|CANT):([A-Z0-9-]+)$/.exec(data);
    if (!match) {
      await this.answerCallback(query.id, 'Unknown action');
      return;
    }

    const isAdmin = await this.isChannelAdmin(query.from.id);
    if (!isAdmin) {
      await this.answerCallback(
        query.id,
        'Only channel admins can update status.',
        true,
      );
      return;
    }

    const status = match[1] as 'PENDING' | 'RESOLVED' | 'CANT';
    const code = match[2];

    const issue = await this.prisma.techIssue.findUnique({
      where: { code },
      include: { reporter: true },
    });
    if (!issue) {
      await this.answerCallback(query.id, 'Issue not found', true);
      return;
    }

    if (status === 'CANT') {
      const clickerChatId = query.from.id;
      this.wizards.set(clickerChatId, {
        step: 'cant_reason',
        issueCode: code,
        lastAt: Date.now(),
      });
      await this.answerCallback(
        query.id,
        "Reply in DM with a short reason for Can't",
        true,
      );
      const dmOk = await this.send(
        clickerChatId,
        `You marked <b>${code}</b> as Can't.\n\nReply with a short reason (or /cancel).`,
      );
      if (dmOk == null) {
        this.logger.warn(
          `Could not DM user ${clickerChatId} for Can't reason on ${code}`,
        );
      }
      return;
    }

    const nextStatus =
      status === 'RESOLVED'
        ? TechIssueStatus.RESOLVED
        : TechIssueStatus.PENDING;

    const updated = await this.prisma.techIssue.update({
      where: { id: issue.id },
      data: {
        status: nextStatus,
        cantReason: null,
      },
      include: { reporter: true },
    });

    await this.refreshChannelMessage(updated);
    await this.refreshControlMessage(query, updated);
    await this.answerCallback(
      query.id,
      `${updated.code}: ${this.statusLabel(updated.status)}`,
    );
  }

  private async handleImageStepCallback(
    query: TelegramCallbackQuery,
    data: string,
    chatId: number,
  ): Promise<void> {
    const wizard = this.wizards.get(chatId);
    if (
      !wizard ||
      (wizard.step !== 'ask_image' && wizard.step !== 'await_photos') ||
      !wizard.issueText
    ) {
      await this.answerCallback(query.id, 'No issue draft. Send text first.', true);
      return;
    }

    const session = await this.getSession(chatId);
    if (!session) {
      this.wizards.delete(chatId);
      await this.answerCallback(query.id, 'Not signed in', true);
      await this.send(chatId, 'You are not signed in. Send /login first.');
      return;
    }

    if (data === 'ti:img:add') {
      wizard.step = 'await_photos';
      wizard.photos = wizard.photos ?? [];
      wizard.lastAt = Date.now();
      this.wizards.set(chatId, wizard);
      await this.answerCallback(query.id, 'Send photo(s)');
      if (query.message?.message_id != null) {
        await this.editMessage(
          chatId,
          query.message.message_id,
          [
            'Got your issue text.',
            '',
            `<i>${this.escapeHtml(wizard.issueText.slice(0, 300))}${wizard.issueText.length > 300 ? '…' : ''}</i>`,
            '',
            '<b>Send photo(s)</b>, then tap <b>Send</b>. Or <b>Skip photos</b>.',
          ].join('\n'),
          this.photoSendKeyboard(),
        );
      } else {
        await this.send(
          chatId,
          'Send photo(s) now, then tap <b>Send</b>. Or tap <b>Skip photos</b>.',
          this.photoSendKeyboard(),
        );
      }
      return;
    }

    if (data === 'ti:img:skip') {
      const issueText = wizard.issueText;
      this.wizards.delete(chatId);
      await this.answerCallback(query.id, 'Sending without photo');
      if (query.message?.message_id != null) {
        await this.editMessage(
          chatId,
          query.message.message_id,
          '⏭ Skipped images — creating issue…',
          this.emptyKeyboard(),
        );
      }
      await this.createIssue({
        chatId,
        userId: session.userId,
        message: issueText,
        photoFileIds: [],
      });
      return;
    }

    // ti:img:send
    if (wizard.step !== 'await_photos') {
      await this.answerCallback(query.id, 'Add image first, or Skip.', true);
      return;
    }
    const photos = wizard.photos ?? [];
    if (!photos.length) {
      await this.answerCallback(
        query.id,
        'Send at least one photo, or Skip photos.',
        true,
      );
      return;
    }
    const issueText = wizard.issueText;
    this.wizards.delete(chatId);
    await this.answerCallback(query.id, 'Sending issue');
    if (query.message?.message_id != null) {
      await this.editMessage(
        chatId,
        query.message.message_id,
        `✅ Sending with ${photos.length} photo(s)…`,
        this.emptyKeyboard(),
      );
    }
    await this.createIssue({
      chatId,
      userId: session.userId,
      message: issueText,
      photoFileIds: photos,
    });
  }

  private async handleCantReason(
    chatId: number,
    text: string,
    wizard: Wizard,
  ): Promise<void> {
    const reason = text.trim();
    if (!reason) {
      await this.send(chatId, 'Please send a short reason, or /cancel.');
      return;
    }
    if (!wizard.issueCode) {
      this.wizards.delete(chatId);
      await this.send(chatId, 'No issue selected. Use status controls again.');
      return;
    }

    const isAdmin = await this.isChannelAdmin(chatId);
    if (!isAdmin) {
      this.wizards.delete(chatId);
      await this.send(
        chatId,
        'Only channel admins can update status.',
      );
      return;
    }

    const issue = await this.prisma.techIssue.findUnique({
      where: { code: wizard.issueCode },
      include: { reporter: true },
    });
    if (!issue) {
      this.wizards.delete(chatId);
      await this.send(chatId, 'Issue not found.');
      return;
    }

    const updated = await this.prisma.techIssue.update({
      where: { id: issue.id },
      data: {
        status: TechIssueStatus.CANT,
        cantReason: reason.slice(0, 1000),
      },
      include: { reporter: true },
    });
    this.wizards.delete(chatId);
    await this.refreshChannelMessage(updated);
    await this.send(
      chatId,
      `Updated <b>${updated.code}</b> to Can't with your reason.`,
      this.statusKeyboard(updated.code),
    );
  }

  private async refreshChannelMessage(issue: {
    code: string;
    status: TechIssueStatus;
    message: string;
    cantReason: string | null;
    channelMessageId: string | null;
    reporter: { name: string; email: string };
  }): Promise<void> {
    if (!issue.channelMessageId) return;
    const text = this.formatChannelMessage({
      code: issue.code,
      status: issue.status,
      reporterName: issue.reporter.name,
      reporterEmail: issue.reporter.email,
      message: issue.message,
      cantReason: issue.cantReason,
    });
    // Never put status keyboards on the public channel (strip leftover ones too).
    const ok = await this.editMessage(
      this.channelId(),
      issue.channelMessageId,
      text,
      this.emptyKeyboard(),
    );
    if (!ok) {
      await this.send(
        this.channelId(),
        `↻ <b>${issue.code}</b> → ${this.statusLabel(issue.status)}${issue.cantReason ? `\nReason: ${this.escapeHtml(issue.cantReason)}` : ''}`,
      );
    }
  }

  /** Update the private control message the admin clicked (if any). */
  private async refreshControlMessage(
    query: TelegramCallbackQuery,
    issue: {
      code: string;
      status: TechIssueStatus;
      message: string;
      cantReason: string | null;
    },
  ): Promise<void> {
    const msg = query.message;
    if (!msg?.message_id || msg.chat.id === Number(this.channelId())) {
      // Channel callbacks: strip keyboard if somehow still present.
      if (msg?.message_id != null && msg.chat.id === Number(this.channelId())) {
        /* already handled in refreshChannelMessage */
      }
      return;
    }
    await this.editMessage(
      msg.chat.id,
      msg.message_id,
      this.formatControlMessage({
        code: issue.code,
        status: issue.status,
        message: issue.message,
        cantReason: issue.cantReason,
      }),
      this.statusKeyboard(issue.code),
    );
  }
}
