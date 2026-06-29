import { evaluatePackageAvailability } from './content-assignment';
import { ExamSkill } from '@prisma/client';

describe('evaluatePackageAvailability', () => {
  const pkg = {
    id: 'pkg-1',
    skills: ['listening', 'reading'],
    listeningTestId: 'listen-1',
    readingTestId: 'read-1',
    writingTestId: null,
    speakingBankId: null,
  };

  function mockTx(overrides: {
    poolTests?: Record<string, string | null>;
    finishedTestIds?: string[];
    priorEnrollmentCode?: string | null;
  }) {
    return {
      packageContentTest: {
        findFirst: jest.fn(async ({ where }: { where: { skill: ExamSkill } }) => {
          const testId = overrides.poolTests?.[where.skill] ?? null;
          return testId ? { testId } : null;
        }),
      },
      contentTest: {
        findUnique: jest.fn(async ({ where }: { where: { id: string } }) => {
          if (where.id.startsWith('missing')) return null;
          return { id: where.id, code: where.id.toUpperCase(), status: 'PUBLISHED' };
        }),
      },
      sectionAttempt: {
        findMany: jest.fn(async () =>
          (overrides.finishedTestIds ?? []).map((id) => ({ contentTestId: id })),
        ),
      },
      enrollment: {
        findFirst: jest.fn(async () =>
          overrides.priorEnrollmentCode
            ? { enrollmentCode: overrides.priorEnrollmentCode }
            : null,
        ),
      },
    } as never;
  }

  it('blocks when student already finished an exclusive test in the package', async () => {
    const result = await evaluatePackageAvailability(
      mockTx({ poolTests: { LISTENING: 'listen-1', READING: 'read-1' }, finishedTestIds: ['listen-1'] }),
      'student-1',
      pkg,
    );
    expect(result.canPurchase).toBe(false);
    expect(result.blockingReason).toContain('already completed');
  });

  it('blocks when student already enrolled in the same package', async () => {
    const result = await evaluatePackageAvailability(
      mockTx({
        poolTests: { LISTENING: 'listen-1', READING: 'read-1' },
        priorEnrollmentCode: 'ENR-1234',
      }),
      'student-1',
      pkg,
    );
    expect(result.canPurchase).toBe(false);
    expect(result.blockingReason).toContain('already enrolled');
  });

  it('allows package when tests are fresh for the student', async () => {
    const result = await evaluatePackageAvailability(
      mockTx({ poolTests: { LISTENING: 'listen-1', READING: 'read-1' } }),
      'student-1',
      pkg,
    );
    expect(result.canPurchase).toBe(true);
  });
});
