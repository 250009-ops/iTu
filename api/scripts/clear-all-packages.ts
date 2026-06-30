/**
 * Remove all mock test packages and their booking history so admins can start fresh.
 * Content tests are kept — only package rows, pool links, enrollments, and orders go.
 *
 * Usage: npx tsx scripts/clear-all-packages.ts --confirm
 */
import { PrismaClient } from '@prisma/client';
import { purgeEnrollments } from '../src/modules/admin/enrollment-cleanup';

const prisma = new PrismaClient();

async function main() {
  if (!process.argv.includes('--confirm')) {
    console.error(
      'This deletes ALL packages and related enrollments/orders/reviews.',
    );
    console.error('Re-run with: npx tsx scripts/clear-all-packages.ts --confirm');
    process.exit(1);
  }

  const packages = await prisma.mockTestPackage.findMany({
    select: { id: true, title: true, slug: true },
    orderBy: { createdAt: 'asc' },
  });

  if (packages.length === 0) {
    console.log('No packages to remove.');
    return;
  }

  console.log(`Found ${packages.length} package(s):`);
  for (const pkg of packages) {
    console.log(`  - ${pkg.title} (/${pkg.slug})`);
  }

  const purged = await purgeEnrollments(prisma, {});

  const packageIds = packages.map((p) => p.id);

  const orphanOrders = await prisma.order.findMany({
    where: { packageId: { in: packageIds } },
    select: { id: true },
  });
  let orphanOrdersDeleted = 0;
  if (orphanOrders.length > 0) {
    const orderIds = orphanOrders.map((o) => o.id);
    await prisma.refund.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    orphanOrdersDeleted = orderIds.length;
  }

  const reviewsDeleted = await prisma.review.deleteMany({
    where: { packageId: { in: packageIds } },
  });

  const poolDeleted = await prisma.packageContentTest.deleteMany({
    where: { packageId: { in: packageIds } },
  });

  const packagesDeleted = await prisma.mockTestPackage.deleteMany({});

  console.log('\nRemoved:');
  console.log(`  ${packagesDeleted.count} package(s)`);
  console.log(`  ${purged.enrollments} enrollment(s)`);
  console.log(`  ${purged.orders + orphanOrdersDeleted} order(s)`);
  console.log(`  ${purged.sessions} exam session(s)`);
  console.log(`  ${reviewsDeleted.count} review(s)`);
  console.log(`  ${poolDeleted.count} content pool link(s)`);
  console.log('\nContent tests were not deleted — re-create packages in Admin → Packages.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
