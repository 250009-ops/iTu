/**
 * Upsert desktop_releases platform settings (run on VPS after uploading installer).
 *
 *   DESKTOP_RELEASE_URL=... DESKTOP_RELEASE_SHA256=... DESKTOP_RELEASE_SIZE=123 \
 *     npx tsx scripts/update-desktop-releases.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const url = process.env.DESKTOP_RELEASE_URL ?? '';
  const sha256 = process.env.DESKTOP_RELEASE_SHA256 ?? '';
  const size = Number(process.env.DESKTOP_RELEASE_SIZE ?? '0');
  const version = process.env.DESKTOP_VERSION ?? '1.0.0';

  if (!url || !sha256 || !size) {
    throw new Error(
      'Set DESKTOP_RELEASE_URL, DESKTOP_RELEASE_SHA256, and DESKTOP_RELEASE_SIZE',
    );
  }

  const settings = {
    version,
    releasedAt: new Date().toISOString(),
    platforms: {
      windows: { url, sha256, size },
      macos: { url: '', sha256: '', size: 0 },
      linux: { url: '', sha256: '', size: 0 },
    },
  };

  await prisma.platformSettings.upsert({
    where: { section: 'desktop_releases' },
    create: { section: 'desktop_releases', settings },
    update: { settings },
  });

  console.log(`Updated desktop_releases → ${url} (${size} bytes)`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
