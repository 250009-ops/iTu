import { BadRequestException } from '@nestjs/common';
import { ContentTestStatus } from '@prisma/client';
import { ContentService } from './content.service';

function makeService(prisma: object) {
  const audit = { log: () => Promise.resolve() };
  return new ContentService(prisma as never, audit as never, {} as never);
}

describe('ContentService test lifecycle', () => {
  describe('updateTest', () => {
    it('allows edits to published tests', async () => {
      const prisma = {
        contentTest: {
          findUnique: () =>
            Promise.resolve({
              id: 't1',
              status: ContentTestStatus.PUBLISHED,
              type: 'LISTENING',
              institutionId: null,
              title: 'Old title',
              content: {},
              answerKey: {},
              durationMin: 30,
              questionCount: 0,
              mediaAssets: [],
            }),
          update: (args: { data: { title?: string } }) =>
            Promise.resolve({
              id: 't1',
              status: ContentTestStatus.PUBLISHED,
              type: 'LISTENING',
              institutionId: null,
              title: args.data.title ?? 'New title',
              content: {},
              answerKey: {},
              durationMin: 30,
              questionCount: 0,
              mediaAssets: [],
              updatedAt: new Date(),
              createdAt: new Date(),
              code: 'L-1',
            }),
        },
      };
      const service = makeService(prisma);

      await expect(
        service.updateTest('t1', { title: 'New title' }, 'admin'),
      ).resolves.toMatchObject({ title: 'New title' });
    });

    it('rejects edits to archived tests', async () => {
      const prisma = {
        contentTest: {
          findUnique: () =>
            Promise.resolve({
              id: 't1',
              status: ContentTestStatus.ARCHIVED,
              type: 'LISTENING',
              institutionId: null,
            }),
        },
      };
      const service = makeService(prisma);

      await expect(
        service.updateTest('t1', { title: 'New title' }, 'admin'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('archiveTest', () => {
    it('rejects retiring tests linked to active packages', async () => {
      const prisma = {
        contentTest: {
          findUnique: () =>
            Promise.resolve({
              id: 't1',
              status: ContentTestStatus.PUBLISHED,
              type: 'LISTENING',
              institutionId: null,
            }),
        },
        packageContentTest: {
          findMany: () =>
            Promise.resolve([
              {
                testId: 't1',
                skill: 'LISTENING',
                package: {
                  id: 'pkg-1',
                  title: 'Full Mock',
                  mockNumber: 1,
                  packageKind: 'listening+reading+writing+speaking',
                  isActive: true,
                },
              },
            ]),
        },
        mockTestPackage: { findMany: () => Promise.resolve([]) },
      };
      const service = makeService(prisma);

      await expect(service.archiveTest('t1', 'admin')).rejects.toThrow(
        /linked to 1 active package/,
      );
    });
  });

  describe('deleteTest', () => {
    it('rejects deleting published tests', async () => {
      const prisma = {
        contentTest: {
          findUnique: () =>
            Promise.resolve({
              id: 't1',
              status: ContentTestStatus.PUBLISHED,
              mediaAssets: [],
              institutionId: null,
            }),
        },
      };
      const service = makeService(prisma);

      await expect(service.deleteTest('t1', 'admin')).rejects.toThrow(
        /Published tests cannot be deleted/,
      );
    });

    it('rejects deleting tests linked via package FK even without pool rows', async () => {
      const prisma = {
        contentTest: {
          findUnique: () =>
            Promise.resolve({
              id: 't1',
              status: ContentTestStatus.DRAFT,
              mediaAssets: [],
              institutionId: null,
            }),
          delete: jest.fn(),
        },
        sectionAttempt: { count: () => Promise.resolve(0) },
        packageContentTest: { findMany: () => Promise.resolve([]) },
        mockTestPackage: {
          findMany: () =>
            Promise.resolve([{ id: 'pkg-1', title: 'Full Mock 001' }]),
        },
        mediaAsset: { deleteMany: jest.fn() },
      };
      const service = makeService(prisma);

      await expect(service.deleteTest('t1', 'admin')).rejects.toThrow(
        /linked to 1 package/,
      );
    });

    it('rejects deleting tests used in exam sections', async () => {
      const prisma = {
        contentTest: {
          findUnique: () =>
            Promise.resolve({
              id: 't1',
              status: ContentTestStatus.DRAFT,
              mediaAssets: [],
              institutionId: null,
            }),
        },
        sectionAttempt: { count: () => Promise.resolve(1) },
      };
      const service = makeService(prisma);

      await expect(service.deleteTest('t1', 'admin')).rejects.toThrow(
        /1 exam section/,
      );
    });
  });
});
