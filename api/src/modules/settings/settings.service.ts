import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExamSkill } from '@prisma/client';
import { AuditAction } from '../../common/audit/audit.actions';
import { AuditService } from '../../common/audit/audit.service';
import {
  BandTiers,
  computeTeacherNetPayout,
  resolveTeacherGrossRate,
  ExaminerSkill,
  mergeBandTiers,
  tierDefaultsForBands,
} from '../../common/examiner-rate-tiers';
import { DEFAULT_MOCK_DAY_CUTOFF } from '../../common/mock-day-policy';
import { PrismaService } from '../../prisma/prisma.service';

const PLATFORM_NAME = 'iTestU';

const DEFAULT_SETTINGS: Record<string, object> = {
  general: {
    platformName: PLATFORM_NAME,
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
    payoutSchedule: 'weekly',
    speakingRate: 20_000,
    writingRate: 20_000,
    bandTiers: mergeBandTiers(null),
  },
  band_table: {
    note: 'Managed via band_conversion_tables',
  },
  notifications: {
    booking: true,
    reminder24: true,
    results: true,
    assigned: true,
    payout: true,
    newDispute: true,
    slaBreach: true,
  },
  integrations: {
    stripeConfigured: false,
    uzumCheckoutConfigured: false,
    smtpConfigured: false,
    sendgridConfigured: false,
    livekitConfigured: false,
    livekitRecordingEnabled: false,
    slackConfigured: false,
    mediaStorageConfigured: false,
  },
  desktop_releases: {
    version: '1.0.1',
    releasedAt: new Date(0).toISOString(),
    platforms: {
      windows: {
        url: 'https://www.itestu.uz/releases/desktop/iTestU_1.0.0_x64-setup.exe',
        sha256: '',
        size: 0,
      },
      macos: {
        url: '',
        sha256: '',
        size: 0,
      },
      linux: {
        url: 'https://www.itestu.uz/releases/desktop/iTestU_1.0.0_amd64.AppImage',
        sha256: '',
        size: 0,
      },
    },
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

    settings.general = this.withFixedPlatformName(settings.general);
    settings.integrations = this.mergeIntegrations(settings.integrations);
    return settings;
  }

  async getSection(section: string) {
    const row = await this.prisma.platformSettings.findUnique({
      where: { section },
    });
    const base = (row?.settings ?? DEFAULT_SETTINGS[section] ?? {}) as object;
    if (section === 'general') {
      return this.withFixedPlatformName(base);
    }
    if (section === 'integrations') {
      return this.mergeIntegrations(base);
    }
    return base;
  }

  async updateSection(section: string, settings: object, actorId: string) {
    const payload =
      section === 'integrations'
        ? this.stripEnvManagedIntegrations(settings)
        : section === 'general'
          ? this.withFixedPlatformName(settings)
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

  private withFixedPlatformName(settings: object): object {
    return {
      ...(settings as Record<string, unknown>),
      platformName: PLATFORM_NAME,
    };
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
      writingRate: commission.writingRate ?? 20_000,
      speakingRate: commission.speakingRate ?? 20_000,
      payoutSchedule: commission.payoutSchedule ?? 'weekly',
    };
  }

  async getBandTiers(): Promise<BandTiers> {
    const commission = (await this.getSection('commission')) as {
      bandTiers?: Partial<BandTiers>;
    };
    return mergeBandTiers(commission.bandTiers);
  }

  getExaminerRateTiersPublic() {
    return this.getBandTiers();
  }

  async resolveTeacherNetPayout(
    teacherId: string,
    skill: ExaminerSkill,
  ): Promise<number> {
    const [teacher, tiers, legacy] = await Promise.all([
      this.prisma.teacherProfile.findUnique({
        where: { id: teacherId },
        select: {
          approvedWritingRate: true,
          approvedSpeakingRate: true,
          requestedWritingRate: true,
          requestedSpeakingRate: true,
          platformSharePercent: true,
          applicationData: true,
        },
      }),
      this.getBandTiers(),
      this.getCommissionRates(),
    ]);

    if (!teacher) {
      return skill === 'writing' ? legacy.writingRate : legacy.speakingRate;
    }

    return computeTeacherNetPayout(teacher, skill, tiers, legacy);
  }

  async resolveTeacherGrossRates(teacherId: string): Promise<{
    writingGross: number;
    speakingGross: number;
    platformSharePercent: number;
    writingNet: number;
    speakingNet: number;
  }> {
    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { id: teacherId },
      select: {
        approvedWritingRate: true,
        approvedSpeakingRate: true,
        requestedWritingRate: true,
        requestedSpeakingRate: true,
        platformSharePercent: true,
        applicationData: true,
      },
    });
    if (!teacher) {
      throw new NotFoundException('Examiner not found');
    }

    const tiers = await this.getBandTiers();
    const legacy = await this.getCommissionRates();
    const app = teacher.applicationData as {
      ieltsWritingBand?: number;
      ieltsSpeakingBand?: number;
    } | null;
    const defaults = tierDefaultsForBands(
      tiers,
      app?.ieltsWritingBand ?? 7.5,
      app?.ieltsSpeakingBand ?? 7.5,
    );

    const writingGross = resolveTeacherGrossRate(
      teacher,
      'writing',
      tiers,
      legacy,
    );
    const speakingGross = resolveTeacherGrossRate(
      teacher,
      'speaking',
      tiers,
      legacy,
    );
    const platformSharePercent =
      teacher.platformSharePercent ?? defaults.writing.platformPercent;

    return {
      writingGross,
      speakingGross,
      platformSharePercent,
      writingNet: computeTeacherNetPayout(teacher, 'writing', tiers, legacy),
      speakingNet: computeTeacherNetPayout(teacher, 'speaking', tiers, legacy),
    };
  }

  /**
   * Minimum student-facing examiner gross rates among approved platform
   * examiners — used for catalog “from …” prices.
   */
  async getMinExaminerGrossRates(): Promise<{
    writingMinGross: number | null;
    speakingMinGross: number | null;
  }> {
    const [teachers, tiers, legacy] = await Promise.all([
      this.prisma.teacherProfile.findMany({
        where: { status: 'APPROVED', institutionId: null },
        select: {
          speciality: true,
          approvedWritingRate: true,
          approvedSpeakingRate: true,
          requestedWritingRate: true,
          requestedSpeakingRate: true,
          platformSharePercent: true,
          applicationData: true,
        },
      }),
      this.getBandTiers(),
      this.getCommissionRates(),
    ]);

    let writingMinGross: number | null = null;
    let speakingMinGross: number | null = null;

    for (const teacher of teachers) {
      const speciality = teacher.speciality.toLowerCase();
      if (speciality === 'writing' || speciality === 'both') {
        const gross = resolveTeacherGrossRate(
          teacher,
          'writing',
          tiers,
          legacy,
        );
        writingMinGross =
          writingMinGross == null ? gross : Math.min(writingMinGross, gross);
      }
      if (speciality === 'speaking' || speciality === 'both') {
        const gross = resolveTeacherGrossRate(
          teacher,
          'speaking',
          tiers,
          legacy,
        );
        speakingMinGross =
          speakingMinGross == null
            ? gross
            : Math.min(speakingMinGross, gross);
      }
    }

    return { writingMinGross, speakingMinGross };
  }

  private mergeIntegrations(integrations: object) {
    const stored = integrations as Record<string, boolean>;
    const livekitConfigured = this.isLivekitConfigured();
    const mediaStorageConfigured = this.isMediaStorageConfigured();
    const smtpConfigured = this.isSmtpConfigured();
    const uzumCheckoutConfigured = this.isUzumCheckoutConfigured();

    return {
      ...stored,
      uzumCheckoutConfigured,
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

  private isUzumCheckoutConfigured(): boolean {
    const terminalId = this.config.get<string>('UZUM_CHECKOUT_TERMINAL_ID')?.trim();
    if (!terminalId) return false;
    const apiKey = this.config.get<string>('UZUM_CHECKOUT_API_KEY')?.trim();
    const certPath = this.config.get<string>('UZUM_CHECKOUT_CERT_PATH')?.trim();
    const keyPath = this.config.get<string>('UZUM_CHECKOUT_KEY_PATH')?.trim();
    return Boolean(apiKey || (certPath && keyPath));
  }
}
