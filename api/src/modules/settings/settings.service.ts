import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExamSkill } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const DEFAULT_SETTINGS: Record<string, object> = {
  general: {
    platformName: 'IELTS Mock ERP',
    supportEmail: 'support@ielts-mock.example',
    timezone: 'UTC',
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
    stripeConfigured: true,
    sendgridConfigured: false,
    livekitConfigured: false,
    livekitRecordingEnabled: false,
    slackConfigured: true,
    s3Configured: false,
  },
};

@Injectable()
export class SettingsService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
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

  async updateSection(section: string, settings: object) {
    const payload =
      section === 'integrations'
        ? this.stripEnvManagedIntegrations(settings)
        : settings;

    return this.prisma.platformSettings.upsert({
      where: { section },
      create: { section, settings: payload },
      update: { settings: payload },
    });
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

  async getCommissionRates() {
    const commission = (await this.getSection('commission')) as {
      writingRate?: number;
      speakingRate?: number;
    };
    return {
      writingRate: commission.writingRate ?? 35,
      speakingRate: commission.speakingRate ?? 25,
    };
  }

  private mergeIntegrations(integrations: object) {
    const stored = integrations as Record<string, boolean>;
    const livekitConfigured = this.isLivekitConfigured();
    const s3Configured = this.isS3Configured();

    return {
      ...stored,
      livekitConfigured,
      livekitRecordingEnabled:
        livekitConfigured &&
        this.config.get<string>('LIVEKIT_RECORDING_ENABLED', 'true') !== 'false',
      s3Configured: s3Configured || Boolean(stored.s3Configured),
    };
  }

  private stripEnvManagedIntegrations(integrations: object) {
    const stored = { ...(integrations as Record<string, unknown>) };
    delete stored.livekitConfigured;
    delete stored.livekitRecordingEnabled;
    delete stored.zoomConfigured;
    if (this.isS3Configured()) {
      delete stored.s3Configured;
    }
    return stored;
  }

  private isLivekitConfigured(): boolean {
    return Boolean(
      this.config.get<string>('LIVEKIT_URL') &&
        this.config.get<string>('LIVEKIT_API_KEY') &&
        this.config.get<string>('LIVEKIT_API_SECRET'),
    );
  }

  private isS3Configured(): boolean {
    return Boolean(
      this.config.get<string>('AWS_S3_BUCKET') &&
        this.config.get<string>('AWS_REGION') &&
        this.config.get<string>('AWS_ACCESS_KEY_ID') &&
        this.config.get<string>('AWS_SECRET_ACCESS_KEY'),
    );
  }
}
