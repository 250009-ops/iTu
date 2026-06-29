import { ContentTestStatus, ExamSkill } from '@prisma/client';
import { resolvePackageContentTestId } from './package-content.resolver';

const PKG = {
  id: 'pkg-1',
  skills: ['listening', 'reading', 'writing', 'speaking'],
  listeningTestId: 'listen-fk',
  readingTestId: null,
  writingTestId: null,
  speakingBankId: null,
};

function makePrisma(stubs: {
  pool?: Record<ExamSkill, string | null>;
  fkStatus?: ContentTestStatus;
  latestPublishedId?: string;
}) {
  const pool = stubs.pool ?? ({} as Record<ExamSkill, string | null>);
  return {
    packageContentTest: {
      findFirst: ({
        where,
      }: {
        where: { packageId: string; skill: ExamSkill };
      }) => {
        const testId = pool[where.skill] ?? null;
        return Promise.resolve(testId ? { testId } : null);
      },
    },
    contentTest: {
      findUnique: ({ where }: { where: { id: string } }) => {
        if (where.id === 'listen-fk') {
          return Promise.resolve({
            id: where.id,
            status: stubs.fkStatus ?? ContentTestStatus.PUBLISHED,
          });
        }
        if (where.id === 'listen-unpublished') {
          return Promise.resolve({
            id: where.id,
            status: ContentTestStatus.DRAFT,
          });
        }
        return Promise.resolve(null);
      },
      findFirst: () => {
        // Would have been the old silent fallback — must never be relied on.
        if (stubs.latestPublishedId) {
          return Promise.resolve({ id: stubs.latestPublishedId });
        }
        return Promise.resolve(null);
      },
    },
  } as never;
}

describe('resolvePackageContentTestId', () => {
  it('returns the pool row when assigned', async () => {
    const prisma = makePrisma({
      pool: { [ExamSkill.LISTENING]: 'pool-listen' } as Record<
        ExamSkill,
        string | null
      >,
    });
    const id = await resolvePackageContentTestId(
      prisma,
      PKG,
      ExamSkill.LISTENING,
    );
    expect(id).toBe('pool-listen');
  });

  it('returns the legacy FK when published and no pool row', async () => {
    const prisma = makePrisma({});
    const id = await resolvePackageContentTestId(
      prisma,
      PKG,
      ExamSkill.LISTENING,
    );
    expect(id).toBe('listen-fk');
  });

  it('returns null when FK points to an unpublished test (no silent fallback)', async () => {
    const prisma = makePrisma({
      fkStatus: ContentTestStatus.DRAFT,
    });
    const id = await resolvePackageContentTestId(
      prisma,
      {
        ...PKG,
        listeningTestId: 'listen-unpublished',
      },
      ExamSkill.LISTENING,
    );
    expect(id).toBeNull();
  });

  it('returns null when skill is included but no test is assigned', async () => {
    const prisma = makePrisma({
      latestPublishedId: 'latest-wrong-test',
    });
    const id = await resolvePackageContentTestId(
      prisma,
      {
        ...PKG,
        listeningTestId: null,
      },
      ExamSkill.LISTENING,
    );
    expect(id).toBeNull();
  });

  it('returns null when the skill is not part of the package', async () => {
    const prisma = makePrisma({});
    const id = await resolvePackageContentTestId(
      prisma,
      {
        ...PKG,
        skills: ['reading'],
        listeningTestId: null,
      },
      ExamSkill.LISTENING,
    );
    expect(id).toBeNull();
  });
});
