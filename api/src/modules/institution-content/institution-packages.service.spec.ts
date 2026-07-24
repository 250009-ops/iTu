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

  it('lists purchased section tests from granted test sets', async () => {
    const prisma = {
      institutionMockSetGrant: {
        findMany: jest.fn(async () => [
          {
            id: 'grant-1',
            setId: 'set-1',
            source: 'PURCHASE',
            createdAt: new Date('2026-07-24'),
            set: {
              id: 'set-1',
              title: '2 Listening · 2 Reading · 2 Writing',
              items: [
                {
                  package: {
                    id: 'pkg-l',
                    title: 'Listening Only Mock-A005',
                    isActive: true,
                    packageKind: 'listening',
                    mockNumber: 5,
                    listeningTestId: 't-l',
                    readingTestId: null,
                    writingTestId: null,
                    speakingBankId: null,
                    contentPool: [{ testId: 't-l' }],
                  },
                },
                {
                  package: {
                    id: 'pkg-r',
                    title: 'Reading Only Mock-A005',
                    isActive: true,
                    packageKind: 'reading',
                    mockNumber: 5,
                    listeningTestId: null,
                    readingTestId: 't-r',
                    writingTestId: null,
                    speakingBankId: null,
                    contentPool: [{ testId: 't-r' }],
                  },
                },
              ],
            },
          },
        ]),
      },
      contentTest: {
        findMany: jest.fn(async () => [
          {
            id: 't-l',
            code: 'LIS-MOCK-A009',
            title: 'Listening Mock-A009',
            type: 'LISTENING',
            status: ContentTestStatus.PUBLISHED,
            version: 1,
            durationMin: 40,
            updatedAt: new Date('2026-07-01'),
            publishedAt: new Date('2026-07-01'),
          },
          {
            id: 't-r',
            code: 'REA-MOCK-A009',
            title: 'Reading Mock-A009',
            type: 'READING',
            status: ContentTestStatus.PUBLISHED,
            version: 1,
            durationMin: 60,
            updatedAt: new Date('2026-07-01'),
            publishedAt: new Date('2026-07-01'),
          },
        ]),
      },
    };
    const service = makeService(prisma);

    const result = await service.listPurchasedTests(user);

    expect(result.grantsCount).toBe(1);
    expect(result.sets).toHaveLength(1);
    expect(result.sets[0]).toMatchObject({
      id: 'set-1',
      title: '2 Listening · 2 Reading · 2 Writing',
      testCount: 2,
    });
    expect(result.tests).toHaveLength(2);
    expect(result.tests[0]).toMatchObject({
      id: 't-l',
      source: 'purchased',
      sourceSetTitle: '2 Listening · 2 Reading · 2 Writing',
      sourceMockLabel: expect.stringContaining('Listening'),
    });
  });

  it('allows saving and activating a Full Academic mock without speaking', async () => {
    const update = jest.fn(async (_args: unknown) => ({
      id: 'pkg-full',
      slug: 'full-a001',
      title: 'Full Academic Mock-A001',
      description: null,
      packageKind: 'listening+reading+writing+speaking',
      mockNumber: 1,
      examType: ExamType.ACADEMIC,
      skills: ['listening', 'reading', 'writing'],
      isActive: false,
      listeningTestId: 't-l',
      readingTestId: 't-r',
      writingTestId: 't-w',
      speakingBankId: null,
    }));
    const prisma = {
      mockTestPackage: {
        findUnique: () =>
          Promise.resolve({
            id: 'pkg-full',
            institutionId: 'centre-a',
            packageKind: 'listening+reading+writing+speaking',
            skills: ['listening', 'reading', 'writing', 'speaking'],
            title: 'Full Academic Mock-A001',
            speakingBankId: null,
          }),
        findMany: () => Promise.resolve([]),
        update,
      },
      contentTest: {
        findMany: () =>
          Promise.resolve([
            {
              id: 't-l',
              code: 'LIS-1',
              type: 'LISTENING',
              status: ContentTestStatus.PUBLISHED,
              institutionId: null,
            },
            {
              id: 't-r',
              code: 'REA-1',
              type: 'READING',
              status: ContentTestStatus.PUBLISHED,
              institutionId: null,
            },
            {
              id: 't-w',
              code: 'WRI-1',
              type: 'WRITING',
              status: ContentTestStatus.PUBLISHED,
              institutionId: null,
            },
          ]),
      },
      packageContentTest: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce([]) // exclusivity check in assert
          .mockResolvedValueOnce([
            { skill: 'LISTENING', testId: 't-l' },
            { skill: 'READING', testId: 't-r' },
            { skill: 'WRITING', testId: 't-w' },
          ]), // activate pool
        deleteMany: () => Promise.resolve({ count: 0 }),
        createMany: () => Promise.resolve({ count: 3 }),
      },
      $transaction: (ops: unknown[]) => Promise.all(ops as Promise<unknown>[]),
    };
    const mockSets = {
      listGrantedPackageIds: jest.fn(async () => ['granted-1']),
    };
    // Mark granted tests so assert allows platform tests
    (prisma.mockTestPackage.findMany as unknown) = () =>
      Promise.resolve([
        {
          listeningTestId: 't-l',
          readingTestId: 't-r',
          writingTestId: 't-w',
          speakingBankId: null,
          contentPool: [],
        },
      ]);
    const service = makeService(prisma, mockSets);

    await expect(
      service.updatePackageLinks(user, 'pkg-full', {
        listeningTestId: 't-l',
        readingTestId: 't-r',
        writingTestId: 't-w',
        speakingBankId: null,
      }),
    ).resolves.toMatchObject({
      listeningTestId: 't-l',
      speakingBankId: null,
      skills: ['listening', 'reading', 'writing'],
    });

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          skills: ['listening', 'reading', 'writing'],
          speakingBankId: null,
        }),
      }),
    );

    await expect(service.activatePackage(user, 'pkg-full')).resolves.toMatchObject({
      id: 'pkg-full',
    });
  });
});
