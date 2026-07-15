export const EXAMINER_BANDS = ['7.5', '8.0', '8.5', '9.0'] as const;

export type ExaminerBand = (typeof EXAMINER_BANDS)[number];
export type ExaminerSkill = 'writing' | 'speaking';

export type BandTierCell = {
  defaultRate: number;
  platformPercent: number;
};

export type BandTiers = Record<
  string,
  { writing: BandTierCell; speaking: BandTierCell }
>;

export const DEFAULT_BAND_TIERS: BandTiers = {
  '7.5': {
    writing: { defaultRate: 15_000, platformPercent: 30 },
    speaking: { defaultRate: 15_000, platformPercent: 30 },
  },
  '8.0': {
    writing: { defaultRate: 18_000, platformPercent: 28 },
    speaking: { defaultRate: 18_000, platformPercent: 28 },
  },
  '8.5': {
    writing: { defaultRate: 20_000, platformPercent: 25 },
    speaking: { defaultRate: 20_000, platformPercent: 25 },
  },
  '9.0': {
    writing: { defaultRate: 22_000, platformPercent: 22 },
    speaking: { defaultRate: 22_000, platformPercent: 22 },
  },
};

export type TeacherRateProfile = {
  approvedWritingRate?: number | null;
  approvedSpeakingRate?: number | null;
  requestedWritingRate?: number | null;
  requestedSpeakingRate?: number | null;
  platformSharePercent?: number | null;
  applicationData?: unknown;
};

export function netExaminerPayout(
  gross: number,
  platformPercent: number,
): number {
  return Math.round(gross * (1 - platformPercent / 100));
}

export function mergeBandTiers(stored?: Partial<BandTiers> | null): BandTiers {
  const merged = structuredClone(DEFAULT_BAND_TIERS);
  if (!stored) return merged;

  for (const band of EXAMINER_BANDS) {
    const row = stored[band];
    if (!row) continue;
    for (const skill of ['writing', 'speaking'] as const) {
      const cell = row[skill];
      if (!cell) continue;
      merged[band][skill] = {
        defaultRate: Number(cell.defaultRate ?? merged[band][skill].defaultRate),
        platformPercent: Number(
          cell.platformPercent ?? merged[band][skill].platformPercent,
        ),
      };
    }
  }
  return merged;
}

export function bandKeyFromApplication(
  applicationData: unknown,
  skill: ExaminerSkill,
): string {
  const app = applicationData as {
    ieltsWritingBand?: number;
    ieltsSpeakingBand?: number;
  } | null;
  const band =
    skill === 'writing' ? app?.ieltsWritingBand : app?.ieltsSpeakingBand;
  const key = band != null ? String(band) : '7.5';
  return EXAMINER_BANDS.includes(key as ExaminerBand) ? key : '7.5';
}

export function computeTeacherNetPayout(
  teacher: TeacherRateProfile,
  skill: ExaminerSkill,
  tiers: BandTiers,
  legacy: { writingRate: number; speakingRate: number },
): number {
  const bandKey = bandKeyFromApplication(teacher.applicationData, skill);
  const tier = tiers[bandKey]?.[skill] ?? tiers['7.5'][skill];

  const gross =
    skill === 'writing'
      ? (teacher.approvedWritingRate ??
        teacher.requestedWritingRate ??
        tier.defaultRate ??
        legacy.writingRate)
      : (teacher.approvedSpeakingRate ??
        teacher.requestedSpeakingRate ??
        tier.defaultRate ??
        legacy.speakingRate);

  const platformPct = teacher.platformSharePercent ?? tier.platformPercent;
  return netExaminerPayout(gross, platformPct);
}

export function tierDefaultsForBands(
  tiers: BandTiers,
  writingBand: number | string,
  speakingBand: number | string,
): {
  writing: BandTierCell;
  speaking: BandTierCell;
} {
  const wKey = EXAMINER_BANDS.includes(String(writingBand) as ExaminerBand)
    ? String(writingBand)
    : '7.5';
  const sKey = EXAMINER_BANDS.includes(String(speakingBand) as ExaminerBand)
    ? String(speakingBand)
    : '7.5';
  return {
    writing: tiers[wKey]?.writing ?? tiers['7.5'].writing,
    speaking: tiers[sKey]?.speaking ?? tiers['7.5'].speaking,
  };
}
