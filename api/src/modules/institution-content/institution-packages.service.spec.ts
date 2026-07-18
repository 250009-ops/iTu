import { BadRequestException } from '@nestjs/common';
import { ContentTestStatus } from '@prisma/client';
import { InstitutionPackagesService } from './institution-packages.service';

function makeService(prisma: object) {
  return new InstitutionPackagesService(prisma as never, { log: jest.fn() } as never);
}

describe('InstitutionPackagesService', () => {
  it('rejects linking platform tests to a private package', async () => {
    const prisma = {
      mockTestPackage: {
        findUnique: () =>
          Promise.resolve({
            id: 'pkg-1',
            institutionId: 'centre-a',
            skills: ['listening', 'reading', 'writing', 'speaking'],
            title: 'Centre mock',
          }),
      },
      contentTest: {
        findMany: () =>
          Promise.resolve([
            {
              id: 't1',
              code: 'LIS-MOCK-A001',
              type: 'LISTENING',
              status: ContentTestStatus.PUBLISHED,
              institutionId: null,
            },
          ]),
      },
      packageContentTest: { findMany: () => Promise.resolve([]) },
    };
    const service = makeService(prisma);

    await expect(
      service.updatePackageLinks(
        { id: 'user-1', institutionId: 'centre-a' } as never,
        'pkg-1',
        { listeningTestId: 't1' },
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
