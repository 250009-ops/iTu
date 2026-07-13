/**
 * Relabel legacy USD currency codes to UZS on packages, orders, and payouts.
 * Does not change amounts — only the currency label.
 *
 * Usage (from api/):
 *   npx tsx scripts/normalize-currency-to-uzs.ts --dry-run
 *   npx tsx scripts/normalize-currency-to-uzs.ts
 */
import { PrismaClient } from '@prisma/client';
import { CATALOG_CURRENCY } from '../src/common/catalog-pricing';

const dryRun = process.argv.includes('--dry-run');
const prisma = new PrismaClient();

async function main() {
  const [packages, orders, payouts] = await Promise.all([
    prisma.mockTestPackage.count({ where: { currency: { not: CATALOG_CURRENCY } } }),
    prisma.order.count({ where: { currency: { not: CATALOG_CURRENCY } } }),
    prisma.payout.count({ where: { currency: { not: CATALOG_CURRENCY } } }),
  ]);

  console.log(
    dryRun
      ? `Dry run — would update currency → ${CATALOG_CURRENCY}:`
      : `Updating currency → ${CATALOG_CURRENCY}:`,
  );
  console.log(`  packages: ${packages}`);
  console.log(`  orders:   ${orders}`);
  console.log(`  payouts:  ${payouts}`);

  if (dryRun || packages + orders + payouts === 0) return;

  const [p, o, pay] = await prisma.$transaction([
    prisma.mockTestPackage.updateMany({
      where: { currency: { not: CATALOG_CURRENCY } },
      data: { currency: CATALOG_CURRENCY },
    }),
    prisma.order.updateMany({
      where: { currency: { not: CATALOG_CURRENCY } },
      data: { currency: CATALOG_CURRENCY },
    }),
    prisma.payout.updateMany({
      where: { currency: { not: CATALOG_CURRENCY } },
      data: { currency: CATALOG_CURRENCY },
    }),
  ]);

  console.log(
    `Done. Updated packages=${p.count}, orders=${o.count}, payouts=${pay.count}.`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
