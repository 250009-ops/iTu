import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ContentTestStatus, ExamType } from '@prisma/client';
import { InstitutionPackagesService } from './institution-packages.service';

function makeService(prisma: object, mockSets?: object) {
  return new InstitutionPackagesService(
    prisma as never,
    { log: jest.fn() } as never,
    (mockSets ?? { listGrantedPackageIds: jest.fn(async () => []) }) as never,
  );
}

const user = { id: 'user-1', institutionId: 'centre-a' } as never;

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
      service.updatePackageLinks(user, 'pkg-1', { listeningTestId: 't1' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('requires studentId for enrollment packages', async () => {
    const service = makeService({});
    await expect(service.listEnrollmentPackages(user, '')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('returns 404 when student belongs to another centre', async () => {
    const prisma = {
      studentProfile: {
        findUnique: () =>
          Promise.resolve({ id: 'student-1', institutionId: 'centre-b' }),
      },
    };
    const service = makeService(prisma);

    await expect(
      service.listEnrollmentPackages(user, 'student-1'),
    ).rejects.toThrow(NotFoundException);
  });

  it('returns empty platform list when no granted sets', async () => {
    const prisma = {
      studentProfile: {
        findUnique: () =>
          Promise.resolve({ id: 'student-1', institutionId: 'centre-a' }),
      },
      mockTestPackage: {
        findMany: jest.fn(async ({ where }: { where: { institutionId?: string | null; id?: { in: string[] } } }) => {
          if (where.institutionId === 'centre-a') {
            return [
              {
                id: 'own-1',
                packageKind: 'listening+reading+writing+speaking',
                examType: ExamType.ACADEMIC,
                title: 'Centre mock',
                mockNumber: 1,
                skills: ['listening', 'reading', 'writing', 'speaking'],
                listeningTestId: null,
                readingTestId: null,
                writingTestId: null,
                speakingBankId: null,
              },
            ];
          }
          return [];
        }),
      },
      packageContentTest: { findFirst: jest.fn(async () => null) },
      contentTest: { findUnique: jest.fn(async () => null) },
      sectionAttempt: { findMany: jest.fn(async () => []) },
      enrollment: { findFirst: jest.fn(async () => null) },
    };
    const mockSets = {
      listGrantedPackageIds: jest.fn(async () => []),
    };
    const service = makeService(prisma, mockSets);

    const result = await service.listEnrollmentPackages(user, 'student-1');

    expect(result.platform).toEqual([]);
    expect(mockSets.listGrantedPackageIds).toHaveBeenCalledWith('centre-a');
  });
});
