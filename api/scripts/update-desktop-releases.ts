/**
 * Upsert desktop_releases platform settings (run on VPS after uploading installers).
 *
 * Single platform (legacy):
 *   DESKTOP_RELEASE_URL=... DESKTOP_RELEASE_SHA256=... DESKTOP_RELEASE_SIZE=123
 *
 * All platforms (JSON):
 *   DESKTOP_RELEASES_JSON='{"version":"1.0.0","platforms":{"windows":{...}}}'
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type PlatformRelease = {
  url: string;
  sha256: string;
  size: number;
};

type DesktopReleasesSettings = {
  version: string;
  releasedAt: string;
  platforms: {
    windows: PlatformRelease;
    macos: PlatformRelease;
    linux: PlatformRelease;
  };
};

async function main() {
  let settings: DesktopReleasesSettings;

  const json = process.env.DESKTOP_RELEASES_JSON;
  if (json) {
    settings = JSON.parse(json) as DesktopReleasesSettings;
    settings.releasedAt = settings.releasedAt || new Date().toISOString();
  } else {
    const url = process.env.DESKTOP_RELEASE_URL ?? '';
    const sha256 = process.env.DESKTOP_RELEASE_SHA256 ?? '';
    const size = Number(process.env.DESKTOP_RELEASE_SIZE ?? '0');
    const version = process.env.DESKTOP_VERSION ?? '1.0.0';
    const platform = (process.env.DESKTOP_PLATFORM ?? 'windows') as
      | 'windows'
      | 'macos'
      | 'linux';

    if (!url || !sha256 || !size) {
      throw new Error(
        'Set DESKTOP_RELEASES_JSON or DESKTOP_RELEASE_URL/SHA256/SIZE',
      );
    }

    const existing = (await prisma.platformSettings.findUnique({
      where: { section: 'desktop_releases' },
    }))?.settings as DesktopReleasesSettings | undefined;

    settings = {
      version,
      releasedAt: new Date().toISOString(),
      platforms: {
        windows: existing?.platforms?.windows ?? { url: '', sha256: '', size: 0 },
        macos: existing?.platforms?.macos ?? { url: '', sha256: '', size: 0 },
        linux: existing?.platforms?.linux ?? { url: '', sha256: '', size: 0 },
      },
    };
    settings.platforms[platform] = { url, sha256, size };
  }

  await prisma.platformSettings.upsert({
    where: { section: 'desktop_releases' },
    create: { section: 'desktop_releases', settings },
    update: { settings },
  });

  console.log(
    `Updated desktop_releases v${settings.version} — ` +
      `windows:${settings.platforms.windows.size || 0}b ` +
      `macos:${settings.platforms.macos.size || 0}b ` +
      `linux:${settings.platforms.linux.size || 0}b`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
