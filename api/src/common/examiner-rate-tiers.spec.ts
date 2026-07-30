import {
  resolveTeacherGrossRate,
  DEFAULT_BAND_TIERS,
  type TeacherRateProfile,
} from './examiner-rate-tiers';

describe('resolveTeacherGrossRate', () => {
  const legacy = { writingRate: 9_000, speakingRate: 9_000 };

  it('prefers approved over requested over tier default', () => {
    const teacher: TeacherRateProfile = {
      approvedWritingRate: 20_000,
      requestedWritingRate: 18_000,
      applicationData: { ieltsWritingBand: 7.5 },
    };
    expect(
      resolveTeacherGrossRate(teacher, 'writing', DEFAULT_BAND_TIERS, legacy),
    ).toBe(20_000);
  });

  it('falls back to requested then band default', () => {
    const requestedOnly: TeacherRateProfile = {
      requestedSpeakingRate: 17_000,
      applicationData: { ieltsSpeakingBand: 8.0 },
    };
    expect(
      resolveTeacherGrossRate(
        requestedOnly,
        'speaking',
        DEFAULT_BAND_TIERS,
        legacy,
      ),
    ).toBe(17_000);

    const bandOnly: TeacherRateProfile = {
      applicationData: { ieltsWritingBand: 6.5 },
    };
    expect(
      resolveTeacherGrossRate(bandOnly, 'writing', DEFAULT_BAND_TIERS, legacy),
    ).toBe(12_000);
  });
});
