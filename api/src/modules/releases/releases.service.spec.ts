import { Test, TestingModule } from '@nestjs/testing';
import { ReleasesService } from './releases.service';
import { SettingsService } from '../settings/settings.service';

describe('ReleasesService', () => {
  let service: ReleasesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReleasesService,
        {
          provide: SettingsService,
          useValue: {
            getSection: jest.fn().mockResolvedValue({
              version: '1.0.0',
              releasedAt: '2026-01-01T00:00:00.000Z',
              platforms: {
                windows: {
                  url: 'https://example.com/app.exe',
                  sha256: 'abc',
                  size: 100,
                },
                macos: { url: '', sha256: '', size: 0 },
                linux: { url: '', sha256: '', size: 0 },
              },
            }),
          },
        },
      ],
    }).compile();

    service = module.get(ReleasesService);
  });

  it('returns latest desktop release for a platform', async () => {
    const result = await service.getLatestDesktop('windows');
    expect(result.platform).toBe('windows');
    expect(result.url).toContain('app.exe');
    expect(result.version).toBe('1.0.0');
  });
});
