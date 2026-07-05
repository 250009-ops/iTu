import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExamSkill } from '@prisma/client';
import { AuditAction } from '../../common/audit/audit.actions';
import { AuditService } from '../../common/audit/audit.service';
import { DEFAULT_MOCK_DAY_CUTOFF } from '../../common/mock-day-policy';
import { PrismaService } from '../../prisma/prisma.service';

const DEFAULT_SETTINGS: Record<string, object> = {
  general: {
    platformName: 'iTestU',
    supportEmail: 'support@itestu.uz',
    timezone: 'Asia/Tashkent',
    defaultLanguage: 'en',
  },
  exam_timers: {
    listening: 40,
    reading: 60,
    writing: 60,
    speaking: 20,
    break: 10,
    checkIn: 30,
    lateJoin: 15,
    dayCutoffTime: '23:59',
    speakingEarlyJoinMin: 5,
  },
  exam_integrity: {
    flagOnTabSwitch: true,
    flagOnPaste: true,
    flagOnFullscreenExit: true,
    flagOnAudioSeek: true,
    maxWarningsBeforeFlag: 1,
  },
  commission: {
    platformCommission: 25,
    speakingRate: 25,
    writingRate: 35,
    disputeRefundCap: 100,
    payoutSchedule: 'weekly',
  },
  band_table: {
    note: 'Managed via band_conversion_tables',
  },
  notifications: {
    booking: true,
    reminder24: true,
    reminder1: true,
    results: true,
    dispute: false,
    assigned: true,
    cancelled: true,
    payout: true,
    disputeRaised: true,
    newDispute: true,
    slaBreach: true,
    digest: false,
    fraud: true,
  },
  integrations: {
    stripeConfigured: false,
    lemonSqueezyConfigured: false,
    smtpConfigured: false,
    sendgridConfigured: false,
    livekitConfigured: false,
    livekitRecordingEnabled: false,
    slackConfigured: false,
    mediaStorageConfigured: false,
  },
};

@Injectable()
export class SettingsService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private audit: AuditService,
  ) {}

  async getAll() {
    const rows = await this.prisma.platformSettings.findMany();
    const settings: Record<string, object> = { ...DEFAULT_SETTINGS };

    for (const row of rows) {
      settings[row.section] = row.settings as object;
    }

    settings.integrations = this.mergeIntegrations(settings.integrations);
    return settings;
  }

  async getSection(section: string) {
    const row = await this.prisma.platformSettings.findUnique({
      where: { section },
    });
    const base = (row?.settings ?? DEFAULT_SETTINGS[section] ?? {}) as object;
    if (section === 'integrations') {
      return this.mergeIntegrations(base);
    }
    return base;
  }

  async updateSection(section: string, settings: object, actorId: string) {
    const payload =
      section === 'integrations'
        ? this.stripEnvManagedIntegrations(settings)
        : settings;

    const updated = await this.prisma.platformSettings.upsert({
      where: { section },
      create: { section, settings: payload },
      update: { settings: payload },
    });

    await this.audit.log({
      userId: actorId,
      action: AuditAction.ADMIN_SETTINGS_UPDATE,
      entity: 'platform_settings',
      entityId: section,
      metadata: { section },
    });

    return updated;
  }

  async getSectionDurationsSec(): Promise<Record<ExamSkill, number>> {
    const timers = (await this.getSection('exam_timers')) as Record<
      string,
      number
    >;
    return {
      LISTENING: (timers.listening ?? 40) * 60,
      READING: (timers.reading ?? 60) * 60,
      WRITING: (timers.writing ?? 60) * 60,
      SPEAKING: (timers.speaking ?? 20) * 60,
    };
  }

  async getMockDayTimers(): Promise<{
    dayCutoffTime: string;
    speakingEarlyJoinMin: number;
    lateJoinMin: number;
    checkInOpensMin: number;
  }> {
    const timers = (await this.getSection('exam_timers')) as Record<
      string,
      number | string
    >;
    return {
      dayCutoffTime:
        typeof timers.dayCutoffTime === 'string'
          ? timers.dayCutoffTime
          : DEFAULT_MOCK_DAY_CUTOFF,
      speakingEarlyJoinMin: Number(timers.speakingEarlyJoinMin ?? 5),
      lateJoinMin: Number(timers.lateJoin ?? 15),
      checkInOpensMin: Number(timers.checkIn ?? 30),
    };
  }

  async getPlatformTimezone(): Promise<string> {
    const general = (await this.getSection('general')) as { timezone?: string };
    return general.timezone ?? 'Asia/Tashkent';
  }

  async getCommissionRates() {
    const commission = (await this.getSection('commission')) as {
      writingRate?: number;
      speakingRate?: number;
      payoutSchedule?: string;
    };
    return {
      writingRate: commission.writingRate ?? 35,
      speakingRate: commission.speakingRate ?? 25,
      payoutSchedule: commission.payoutSchedule ?? 'weekly',
    };
  }

  private mergeIntegrations(integrations: object) {
    const stored = integrations as Record<string, boolean>;
    const livekitConfigured = this.isLivekitConfigured();
    const mediaStorageConfigured = this.isMediaStorageConfigured();
    const smtpConfigured = this.isSmtpConfigured();
    const lemonSqueezyConfigured = this.isLemonSqueezyConfigured();

    return {
      ...stored,
      lemonSqueezyConfigured,
      smtpConfigured,
      sendgridConfigured: smtpConfigured || Boolean(stored.sendgridConfigured),
      livekitConfigured,
      livekitRecordingEnabled:
        livekitConfigured &&
        this.config.get<string>('LIVEKIT_RECORDING_ENABLED', 'true') !== 'false',
      mediaStorageConfigured,
      // Legacy key — treat VPS media storage as connected storage
      s3Configured: mediaStorageConfigured || Boolean(stored.s3Configured),
    };
  }

  private stripEnvManagedIntegrations(integrations: object) {
    const stored = { ...(integrations as Record<string, unknown>) };
    delete stored.livekitConfigured;
    delete stored.livekitRecordingEnabled;
    delete stored.zoomConfigured;
    delete stored.mediaStorageConfigured;
    delete stored.s3Configured;
    delete stored.smtpConfigured;
    delete stored.sendgridConfigured;
    return stored;
  }

  private isLivekitConfigured(): boolean {
    return Boolean(
      this.config.get<string>('LIVEKIT_URL') &&
        this.config.get<string>('LIVEKIT_API_KEY') &&
        this.config.get<string>('LIVEKIT_API_SECRET'),
    );
  }

  private isMediaStorageConfigured(): boolean {
    return Boolean(
      this.config.get<string>('MEDIA_ROOT') &&
        this.config.get<string>('MEDIA_PUBLIC_URL'),
    );
  }

  private isSmtpConfigured(): boolean {
    return Boolean(
      this.config.get<string>('SMTP_HOST')?.trim() &&
        this.config.get<string>('SMTP_USER')?.trim() &&
        this.config.get<string>('SMTP_PASS')?.trim(),
    );
  }

  private isLemonSqueezyConfigured(): boolean {
    return Boolean(
      this.config.get<string>('LEMON_SQUEEZY_API_KEY')?.trim() &&
        this.config.get<string>('LEMON_SQUEEZY_STORE_ID')?.trim(),
    );
  }
}
