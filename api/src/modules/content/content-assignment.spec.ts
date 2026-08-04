import {
  evaluatePackageAvailability,
  resolveNextPackageForStudent,
} from './content-assignment';
import { ExamSkill, ExamType } from '@prisma/client';

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

  it('does not block on PENDING_PAYMENT holds (failed/expired checkout)', async () => {
    const tx = mockTx({
      poolTests: { LISTENING: 'listen-1', READING: 'read-1' },
    });
    (tx as { enrollment: { findFirst: jest.Mock } }).enrollment.findFirst =
      jest.fn(async ({ where }: { where: { status?: { in?: string[] } } }) => {
        // Simulate a PENDING_PAYMENT row existing, but query only matches active statuses.
        if (where.status?.in?.includes('PENDING_PAYMENT')) {
          return { enrollmentCode: 'ENR-PENDING' };
        }
        return null;
      });

    const result = await evaluatePackageAvailability(tx, 'student-1', pkg);
    expect(result.canPurchase).toBe(true);
    expect(
      (tx as { enrollment: { findFirst: jest.Mock } }).enrollment.findFirst,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: {
            in: ['ENROLLED', 'IN_PROGRESS', 'AWAITING_RESULTS', 'COMPLETED'],
          },
        }),
      }),
    );
  });

  it('allows package when tests are fresh for the student', async () => {
    const result = await evaluatePackageAvailability(
      mockTx({ poolTests: { LISTENING: 'listen-1', READING: 'read-1' } }),
      'student-1',
      pkg,
    );
    expect(result.canPurchase).toBe(true);
  });

  it('only counts finished tests from paid enrollments (bonus ≠ paid purchase)', async () => {
    const tx = mockTx({
      poolTests: { LISTENING: 'listen-1', READING: 'read-1' },
    });
    await evaluatePackageAvailability(tx, 'student-1', pkg);
    expect(
      (tx as { sectionAttempt: { findMany: jest.Mock } }).sectionAttempt
        .findMany,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          session: {
            enrollment: expect.objectContaining({
              studentId: 'student-1',
              welcomePromoGranted: false,
              referralRewardGranted: false,
              adminGranted: false,
              institutionGranted: false,
            }),
          },
        }),
      }),
    );
  });
});

describe('resolveNextPackageForStudent', () => {
  it('scopes candidates to institutionId when provided', async () => {
    const findMany = jest.fn(async ({ where }: { where: { institutionId: string | null } }) => {
      if (where.institutionId === 'centre-a') {
        return [
          {
            id: 'own-1',
            skills: ['listening'],
            listeningTestId: 'listen-1',
            readingTestId: null,
            writingTestId: null,
            speakingBankId: null,
            packageKind: 'listening',
            mockNumber: 1,
          },
        ];
      }
      return [];
    });

    const tx = {
      mockTestPackage: { findMany },
      packageContentTest: {
        findFirst: jest.fn(async () => ({ testId: 'listen-1' })),
      },
      contentTest: {
        findUnique: jest.fn(async () => ({
          id: 'listen-1',
          code: 'LIS-MOCK-A001',
          status: 'PUBLISHED',
        })),
      },
      sectionAttempt: { findMany: jest.fn(async () => []) },
      enrollment: { findFirst: jest.fn(async () => null) },
    } as never;

    const result = await resolveNextPackageForStudent(tx, 'student-1', {
      packageKind: 'listening',
      examType: ExamType.ACADEMIC,
      institutionId: 'centre-a',
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ institutionId: 'centre-a' }),
      }),
    );
    expect(result?.id).toBe('own-1');
  });
});
