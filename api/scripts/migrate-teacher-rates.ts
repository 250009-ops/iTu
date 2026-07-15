/**
 * Backfill approved examiner rates from band tiers for existing approved teachers.
 *
 *   npx tsx scripts/migrate-teacher-rates.ts
 *   npx tsx scripts/migrate-teacher-rates.ts --dry-run
 */
import { PrismaClient } from '@prisma/client';
import {
  mergeBandTiers,
  tierDefaultsForBands,
} from '../src/common/examiner-rate-tiers';

const prisma = new PrismaClient();
const dryRun = process.argv.includes('--dry-run');

async function main() {
  const commissionRow = await prisma.platformSettings.findUnique({
    where: { section: 'commission' },
  });
  const stored = (commissionRow?.settings ?? {}) as {
    bandTiers?: Parameters<typeof mergeBandTiers>[0];
    writingRate?: number;
    speakingRate?: number;
  };
  const tiers = mergeBandTiers(stored.bandTiers);
  const legacyWriting = stored.writingRate ?? 20_000;
  const legacySpeaking = stored.speakingRate ?? 20_000;

  const teachers = await prisma.teacherProfile.findMany({
    where: { status: 'APPROVED', institutionId: null },
  });

  let updated = 0;
  for (const teacher of teachers) {
    const app = teacher.applicationData as {
      ieltsWritingBand?: number;
      ieltsSpeakingBand?: number;
    } | null;
    const defaults = tierDefaultsForBands(
      tiers,
      app?.ieltsWritingBand ?? 7.5,
      app?.ieltsSpeakingBand ?? 7.5,
    );

    const approvedWritingRate =
      teacher.approvedWritingRate ??
      teacher.requestedWritingRate ??
      defaults.writing.defaultRate ??
      legacyWriting;
    const approvedSpeakingRate =
      teacher.approvedSpeakingRate ??
      teacher.requestedSpeakingRate ??
      defaults.speaking.defaultRate ??
      legacySpeaking;
    const platformSharePercent =
      teacher.platformSharePercent ?? defaults.writing.platformPercent;

    const needsUpdate =
      teacher.approvedWritingRate == null ||
      teacher.approvedSpeakingRate == null ||
      teacher.platformSharePercent == null;

    if (!needsUpdate) continue;

    console.log(
      `${dryRun ? '[dry-run] ' : ''}Teacher ${teacher.id}: writing=${approvedWritingRate}, speaking=${approvedSpeakingRate}, platform=${platformSharePercent}%`,
    );

    if (!dryRun) {
      await prisma.teacherProfile.update({
        where: { id: teacher.id },
        data: {
          approvedWritingRate,
          approvedSpeakingRate,
          platformSharePercent,
        },
      });
    }
    updated += 1;
  }

  if (!dryRun && !commissionRow) {
    await prisma.platformSettings.create({
      data: {
        section: 'commission',
        settings: {
          payoutSchedule: 'weekly',
          bandTiers: tiers,
          writingRate: legacyWriting,
          speakingRate: legacySpeaking,
        },
      },
    });
    console.log('Created default commission settings with band tiers.');
  } else if (!dryRun && commissionRow) {
    const current = commissionRow.settings as Record<string, unknown>;
    if (!current.bandTiers) {
      await prisma.platformSettings.update({
        where: { section: 'commission' },
        data: {
          settings: {
            ...current,
            bandTiers: tiers,
          },
        },
      });
      console.log('Added bandTiers to existing commission settings.');
    }
  }

  console.log(
    `${dryRun ? 'Would update' : 'Updated'} ${updated} approved teacher(s).`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
