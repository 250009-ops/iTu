/**
 * Idempotent upsert of Listening Only + Reading Only catalog packages.
 * Safe to run on production after deploy (no db:seed).
 */
import { ExamType, PrismaClient } from '@prisma/client';
import { getPackageContentTemplate } from '../src/common/package-templates';
import { CATALOG_CURRENCY } from '../src/common/catalog-pricing';

const prisma = new PrismaClient();

async function ensureSkillPackage(
  packageKind: 'listening' | 'reading',
  slug: string,
  title: string,
  testId: string,
) {
  const template = getPackageContentTemplate(packageKind, ExamType.ACADEMIC);
  const existing = await prisma.mockTestPackage.findFirst({
    where: { packageKind, mockNumber: 1 },
  });

  const data = {
    slug,
    title,
    description: template.description,
    price: template.suggestedPrice,
    currency: CATALOG_CURRENCY,
    examType: ExamType.ACADEMIC,
    packageKind,
    mockNumber: 1,
    isActive: true,
    skills: [packageKind],
    included: template.included,
    rules: template.rules,
    ...(packageKind === 'listening'
      ? { listeningTestId: testId }
      : { readingTestId: testId }),
  };

  const pkg = existing
    ? await prisma.mockTestPackage.update({
        where: { id: existing.id },
        data: { ...data, slug: existing.slug },
      })
    : await prisma.mockTestPackage.create({ data });

  await prisma.packageContentTest.createMany({
    data: [
      {
        packageId: pkg.id,
        testId,
        skill: packageKind.toUpperCase() as 'LISTENING' | 'READING',
      },
    ],
    skipDuplicates: true,
  });

  console.log(`✓ ${title} (${pkg.slug})`);
}

async function main() {
  const listeningTest = await prisma.contentTest.findFirst({
    where: { type: 'LISTENING', status: 'PUBLISHED' },
    orderBy: { publishedAt: 'asc' },
  });
  const readingTest = await prisma.contentTest.findFirst({
    where: { type: 'READING', status: 'PUBLISHED' },
    orderBy: { publishedAt: 'asc' },
  });

  if (!listeningTest) {
    console.warn('No published listening test — skip listening-only package');
  } else {
    await ensureSkillPackage(
      'listening',
      'listening-only',
      'Listening Only 001',
      listeningTest.id,
    );
  }

  if (!readingTest) {
    console.warn('No published reading test — skip reading-only package');
  } else {
    await ensureSkillPackage(
      'reading',
      'reading-only',
      'Reading Only 001',
      readingTest.id,
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
