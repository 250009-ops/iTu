/**
 * Sync all catalog package prices/currency to UZS (matches Lemon Squeezy).
 */
import { PrismaClient } from '@prisma/client';
import {
  CATALOG_CURRENCY,
  uzsPriceForPackageKind,
} from '../src/common/catalog-pricing';

const prisma = new PrismaClient();

async function main() {
  const packages = await prisma.mockTestPackage.findMany({
    where: { isActive: true },
    select: { id: true, slug: true, title: true, packageKind: true, price: true, currency: true },
  });

  let updated = 0;
  for (const pkg of packages) {
    const price = uzsPriceForPackageKind(pkg.packageKind);
    if (pkg.price === price && pkg.currency === CATALOG_CURRENCY) continue;

    await prisma.mockTestPackage.update({
      where: { id: pkg.id },
      data: { price, currency: CATALOG_CURRENCY },
    });
    console.log(`✓ ${pkg.slug}: ${price.toLocaleString()} ${CATALOG_CURRENCY}`);
    updated += 1;
  }

  console.log(updated > 0 ? `Updated ${updated} package(s).` : 'All packages already in UZS.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
