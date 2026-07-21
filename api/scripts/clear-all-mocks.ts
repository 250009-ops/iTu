/**
 * Wipe all mock packages and Content Studio papers so admins can recreate from A001.
 * Removes packages, enrollments/orders/sessions, institution mock sets, content tests,
 * and media asset rows tied to those tests. Practice products are left alone.
 *
 * Usage: npx tsx scripts/clear-all-mocks.ts --confirm
 */
import { PrismaClient } from '@prisma/client';
import { purgeEnrollments } from '../src/modules/admin/enrollment-cleanup';

const prisma = new PrismaClient();

async function main() {
  if (!process.argv.includes('--confirm')) {
    console.error(
      'This deletes ALL mock packages, Content Studio tests, and related booking history.',
    );
    console.error('Re-run with: npx tsx scripts/clear-all-mocks.ts --confirm');
    process.exit(1);
  }

  const [packages, tests, mockSets] = await Promise.all([
    prisma.mockTestPackage.findMany({
      select: { id: true, title: true, slug: true, mockNumber: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.contentTest.findMany({
      select: {
        id: true,
        code: true,
        title: true,
        type: true,
        status: true,
        institutionId: true,
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.institutionMockSet.findMany({
      select: { id: true, title: true, slug: true },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  console.log(`Found ${packages.length} package(s):`);
  for (const pkg of packages) {
    console.log(`  - ${pkg.title} (#${pkg.mockNumber} /${pkg.slug})`);
  }
  console.log(`Found ${tests.length} content test(s):`);
  for (const t of tests) {
    const scope = t.institutionId ? 'institution' : 'platform';
    console.log(`  - [${t.type}] ${t.code} (${t.status}, ${scope})`);
  }
  console.log(`Found ${mockSets.length} institution mock set(s):`);
  for (const s of mockSets) {
    console.log(`  - ${s.title} (/${s.slug})`);
  }

  if (packages.length === 0 && tests.length === 0 && mockSets.length === 0) {
    console.log('\nNothing to remove — already clean.');
    return;
  }

  console.log('\nPurging enrollments / exam history...');
  const purged = await purgeEnrollments(prisma, {});

  const packageIds = packages.map((p) => p.id);
  const setIds = mockSets.map((s) => s.id);

  // Mock-set shop orders (not always linked via enrollment)
  const mockSetOrders =
    setIds.length > 0
      ? await prisma.order.findMany({
          where: { institutionMockSetId: { in: setIds } },
          select: { id: true },
        })
      : [];
  if (mockSetOrders.length > 0) {
    const orderIds = mockSetOrders.map((o) => o.id);
    await prisma.institutionMockSetGrant.updateMany({
      where: { orderId: { in: orderIds } },
      data: { orderId: null },
    });
    await prisma.refund.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
  }

  if (setIds.length > 0) {
    await prisma.institutionMockSetGrant.deleteMany({
      where: { setId: { in: setIds } },
    });
    await prisma.institutionMockSetItem.deleteMany({
      where: { setId: { in: setIds } },
    });
  }

  let orphanOrdersDeleted = 0;
  if (packageIds.length > 0) {
    const orphanOrders = await prisma.order.findMany({
      where: { packageId: { in: packageIds } },
      select: { id: true },
    });
    if (orphanOrders.length > 0) {
      const orderIds = orphanOrders.map((o) => o.id);
      await prisma.refund.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
      orphanOrdersDeleted = orderIds.length;
    }

    await prisma.review.deleteMany({ where: { packageId: { in: packageIds } } });
    await prisma.packageContentTest.deleteMany({
      where: { packageId: { in: packageIds } },
    });
  }

  // Clear exclusive FKs before deleting packages (Restrict on ContentTest)
  if (packageIds.length > 0) {
    await prisma.mockTestPackage.updateMany({
      where: { id: { in: packageIds } },
      data: {
        listeningTestId: null,
        readingTestId: null,
        writingTestId: null,
        speakingBankId: null,
      },
    });
  }

  const packagesDeleted = await prisma.mockTestPackage.deleteMany({});
  const mockSetsDeleted = await prisma.institutionMockSet.deleteMany({});

  // Any leftover attempts that still point at content tests
  const attemptsCleared = await prisma.sectionAttempt.updateMany({
    where: { contentTestId: { not: null } },
    data: { contentTestId: null },
  });

  const testIds = tests.map((t) => t.id);
  let mediaDeleted = 0;
  if (testIds.length > 0) {
    const media = await prisma.mediaAsset.deleteMany({
      where: { testId: { in: testIds } },
    });
    mediaDeleted = media.count;
  }

  // Detach practice units that were cloned from mock papers
  await prisma.practiceUnit.updateMany({
    where: { sourceContentTestId: { not: null } },
    data: { sourceContentTestId: null },
  });

  const testsDeleted = await prisma.contentTest.deleteMany({});

  console.log('\nRemoved:');
  console.log(`  ${packagesDeleted.count} package(s)`);
  console.log(`  ${testsDeleted.count} content test(s)`);
  console.log(`  ${mockSetsDeleted.count} institution mock set(s)`);
  console.log(`  ${mediaDeleted} media asset row(s)`);
  console.log(`  ${purged.enrollments} enrollment(s)`);
  console.log(`  ${purged.orders + orphanOrdersDeleted + mockSetOrders.length} order(s)`);
  console.log(`  ${purged.sessions} exam session(s)`);
  console.log(`  ${attemptsCleared.count} section attempt content-test link(s) nulled`);

  const remaining = await Promise.all([
    prisma.mockTestPackage.count(),
    prisma.contentTest.count(),
    prisma.institutionMockSet.count(),
    prisma.enrollment.count(),
    prisma.packageContentTest.count(),
  ]);

  console.log('\nRemaining counts:');
  console.log(`  packages=${remaining[0]} content_tests=${remaining[1]} mock_sets=${remaining[2]}`);
  console.log(`  enrollments=${remaining[3]} pool_links=${remaining[4]}`);
  console.log(
    '\nDone. Next Content Studio paper will be A001 (per skill). Create new mocks in Admin → Mock Creation.',
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
