import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationType, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SettingsService } from '../../modules/settings/settings.service';
import { MailService } from './mail.service';
import { portalNotificationEmail } from './mail.templates';

const TYPE_PLATFORM_KEY: Partial<Record<NotificationType, string>> = {
  RESULT: 'results',
  REMINDER: 'reminder24',
  GRADING: 'assigned',
  PAYMENT: 'booking',
  INFO: 'booking',
};

const TYPE_STUDENT_PREF: Partial<Record<NotificationType, string>> = {
  RESULT: 'results_email',
  REMINDER: 'mock-reminders_email',
  GRADING: 'grading_email',
  PAYMENT: 'booking_email',
  INFO: 'booking_email',
};

@Injectable()
export class EmailDispatchService {
  private readonly logger = new Logger(EmailDispatchService.name);

  constructor(
    private mail: MailService,
    private prisma: PrismaService,
    private settings: SettingsService,
    private config: ConfigService,
  ) {}

  async sendForNotification(
    userId: string,
    title: string,
    body: string,
    type: NotificationType,
    link?: string,
  ): Promise<void> {
    if (!this.mail.isConfigured()) return;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { studentProfile: true },
    });
    if (!user?.email) return;

    const platform = (await this.settings.getSection('notifications')) as Record<
      string,
      boolean
    >;

    if (
      !this.shouldSend(
        type,
        title,
        user.role,
        platform,
        user.studentProfile?.notificationPrefs,
      )
    ) {
      return;
    }

    const appUrl = this.config
      .get<string>('APP_URL', 'https://itestu.uz')
      .replace(/\/$/, '');
    const actionUrl = link?.startsWith('http')
      ? link
      : link
        ? `${appUrl}${link}`
        : undefined;
    const { subject, text, html } = portalNotificationEmail(
      sanitizePersonNameForEmail(user.name),
      title,
      body,
      actionUrl,
    );

    try {
      await this.mail.send({ to: user.email, subject, text, html });
    } catch (err) {
      this.logger.warn(
        `Notification email to ${user.email} failed: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  private shouldSend(
    type: NotificationType,
    title: string,
    role: UserRole,
    platform: Record<string, boolean>,
    studentPrefs: unknown,
  ): boolean {
    if (type === NotificationType.SYSTEM) {
      const lower = title.toLowerCase();
      if (lower.includes('payout')) return platform.payout !== false;
      if (lower.includes('ticket') || lower.includes('dispute')) {
        return platform.newDispute !== false;
      }
      return role !== UserRole.STUDENT;
    }

    const platformKey = TYPE_PLATFORM_KEY[type];
    if (platformKey && platform[platformKey] === false) return false;

    if (role !== UserRole.STUDENT) return true;

    const prefs = (studentPrefs ?? {}) as Record<string, boolean>;
    const prefKey = TYPE_STUDENT_PREF[type];
    if (prefKey && prefKey in prefs && prefs[prefKey] === false) return false;

    return true;
  }
}

/** Repair common mojibake / replacement-char damage in stored display names. */
export function sanitizePersonNameForEmail(name: string): string {
  return name
    .replace(/(\p{L})\uFFFD(\p{L})/gu, "$1'$2")
    .replace(/\uFFFD/g, "'");
}
