import { Injectable } from '@nestjs/common';
import { SettingsService } from '../settings/settings.service';

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

const DEFAULT_RELEASES: DesktopReleasesSettings = {
  version: '1.0.0',
  releasedAt: new Date(0).toISOString(),
  platforms: {
    windows: { url: '', sha256: '', size: 0 },
    macos: { url: '', sha256: '', size: 0 },
    linux: { url: '', sha256: '', size: 0 },
  },
};

@Injectable()
export class ReleasesService {
  constructor(private settings: SettingsService) {}

  private async getSettings(): Promise<DesktopReleasesSettings> {
    const raw = (await this.settings.getSection('desktop_releases')) as
      | Partial<DesktopReleasesSettings>
      | undefined;
    return {
      ...DEFAULT_RELEASES,
      ...raw,
      platforms: {
        ...DEFAULT_RELEASES.platforms,
        ...(raw?.platforms ?? {}),
      },
    };
  }

  async getLatestDesktop(platform: 'windows' | 'macos' | 'linux') {
    const settings = await this.getSettings();
    const artifact = settings.platforms[platform];
    return {
      platform,
      version: settings.version,
      releasedAt: settings.releasedAt,
      url: artifact.url,
      sha256: artifact.sha256,
      size: artifact.size,
    };
  }

  async getAllDesktop() {
    const settings = await this.getSettings();
    return {
      version: settings.version,
      releasedAt: settings.releasedAt,
      platforms: settings.platforms,
    };
  }
}
