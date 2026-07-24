import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  ContentTestStatus,
  EnrollmentStatus,
  ExamType,
  ResultsStatus,
} from '@prisma/client';
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
  it('allows linking purchased (platform) tests from a granted set', async () => {
    const prisma = {
      mockTestPackage: {
        findUnique: () =>
          Promise.resolve({
            id: 'pkg-1',
            institutionId: 'centre-a',
            skills: ['listening'],
            title: 'Centre listening mock',
          }),
        findMany: () =>
          Promise.resolve([
            {
              listeningTestId: 't1',
              readingTestId: null,
              writingTestId: null,
              speakingBankId: null,
              contentPool: [],
            },
          ]),
        update: () =>
          Promise.resolve({
            id: 'pkg-1',
            slug: 'centre-listening',
            title: 'Centre listening mock',
            description: null,
            packageKind: 'listening',
            mockNumber: 1,
            examType: ExamType.ACADEMIC,
            skills: ['listening'],
            isActive: false,
            listeningTestId: 't1',
            readingTestId: null,
            writingTestId: null,
            speakingBankId: null,
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
      packageContentTest: {
        findMany: () => Promise.resolve([]),
        deleteMany: () => Promise.resolve({ count: 0 }),
        createMany: () => Promise.resolve({ count: 1 }),
      },
      $transaction: (ops: unknown[]) => Promise.all(ops as Promise<unknown>[]),
    };
    const mockSets = {
      listGrantedPackageIds: jest.fn(async () => ['granted-pkg-1']),
    };
    const service = makeService(prisma, mockSets);

    await expect(
      service.updatePackageLinks(user, 'pkg-1', { listeningTestId: 't1' }),
    ).resolves.toMatchObject({ id: 'pkg-1', listeningTestId: 't1' });
  });

  it('rejects linking platform tests that are not in a granted set', async () => {
    const prisma = {
      mockTestPackage: {
        findUnique: () =>
          Promise.resolve({
            id: 'pkg-1',
            institutionId: 'centre-a',
            skills: ['listening'],
            title: 'Centre mock',
          }),
        findMany: () => Promise.resolve([]),
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

  it('returns centre mocks with enrollStatus for a student', async () => {
    const prisma = {
      studentProfile: {
        findUnique: () =>
          Promise.resolve({ id: 'student-1', institutionId: 'centre-a' }),
      },
      mockTestPackage: {
        findMany: jest.fn(async () => [
          {
            id: 'own-1',
            packageKind: 'listening',
            examType: ExamType.ACADEMIC,
            title: 'Listening Mock-A001',
            mockNumber: 1,
            skills: ['listening'],
            listeningTestId: 't1',
            readingTestId: null,
            writingTestId: null,
            speakingBankId: null,
          },
          {
            id: 'own-2',
            packageKind: 'listening',
            examType: ExamType.ACADEMIC,
            title: 'Listening Mock-A002',
            mockNumber: 2,
            skills: ['listening'],
            listeningTestId: 't2',
            readingTestId: null,
            writingTestId: null,
            speakingBankId: null,
          },
        ]),
      },
      packageContentTest: {
        findFirst: jest.fn(async () => null),
      },
      contentTest: {
        findUnique: jest.fn(async ({ where }: { where: { id: string } }) => ({
          id: where.id,
          code: where.id === 't1' ? 'LIS-1' : 'LIS-2',
          status: ContentTestStatus.PUBLISHED,
        })),
      },
      sectionAttempt: { findMany: jest.fn(async () => []) },
      enrollment: {
        findFirst: jest.fn(
          async ({ where }: { where: { packageId: string } }) => {
            if (where.packageId === 'own-1') {
              return {
                enrollmentCode: 'ENR-1',
                mockDate: new Date('2026-01-01'),
                status: EnrollmentStatus.COMPLETED,
                resultsStatus: ResultsStatus.RELEASED,
              };
            }
            return null;
          },
        ),
      },
    };
    const service = makeService(prisma);

    const result = await service.listEnrollmentPackages(user, 'student-1');

    expect(result.mocks).toHaveLength(2);
    expect(result.mocks[0]).toMatchObject({
      id: 'own-1',
      enrollStatus: 'completed',
      statusLabel: 'Already completed',
      examType: ExamType.ACADEMIC,
    });
    expect(result.mocks[1]).toMatchObject({
      id: 'own-2',
      enrollStatus: 'available',
      statusLabel: 'Not taken yet',
      examType: ExamType.ACADEMIC,
    });
    expect(result.platform).toEqual([]);
    expect(result.own).toEqual([]);
  });
});
