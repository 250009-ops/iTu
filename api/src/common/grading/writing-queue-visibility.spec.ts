import { isWritingReadyForTeacherQueue } from './writing-queue-visibility';

describe('isWritingReadyForTeacherQueue', () => {
  const prevKey = process.env.OPENAI_API_KEY;
  const prevFlag = process.env.AI_FEATURES_ENABLED;

  afterEach(() => {
    if (prevKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = prevKey;
    if (prevFlag === undefined) delete process.env.AI_FEATURES_ENABLED;
    else process.env.AI_FEATURES_ENABLED = prevFlag;
  });

  it('is ready when AI is not configured', () => {
    delete process.env.OPENAI_API_KEY;
    process.env.AI_FEATURES_ENABLED = 'true';
    expect(isWritingReadyForTeacherQueue(null)).toBe(true);
  });

  it('is ready when AI features kill switch is off', () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    process.env.AI_FEATURES_ENABLED = 'false';
    expect(isWritingReadyForTeacherQueue(null)).toBe(true);
  });

  it('requires READY or FAILED when AI assist is enabled', () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    process.env.AI_FEATURES_ENABLED = 'true';
    expect(isWritingReadyForTeacherQueue(null)).toBe(false);
    expect(isWritingReadyForTeacherQueue({ status: 'PENDING' as never })).toBe(
      false,
    );
    expect(isWritingReadyForTeacherQueue({ status: 'READY' as never })).toBe(
      true,
    );
    expect(isWritingReadyForTeacherQueue({ status: 'FAILED' as never })).toBe(
      true,
    );
  });
});

/** Mirrors scoreWriting / scoreSpeaking assignment gate. */
function isAssignedOrAdmin(
  assignedTeacherId: string | null | undefined,
  user: { teacherProfileId?: string | null; role: string },
): boolean {
  return (
    assignedTeacherId === user.teacherProfileId || user.role === 'ADMIN'
  );
}

describe('grading assignment gate', () => {
  it('allows the assigned teacher', () => {
    expect(
      isAssignedOrAdmin('t1', { teacherProfileId: 't1', role: 'TEACHER' }),
    ).toBe(true);
  });

  it('allows ADMIN override', () => {
    expect(
      isAssignedOrAdmin('t1', { teacherProfileId: 't2', role: 'ADMIN' }),
    ).toBe(true);
  });

  it('rejects a different teacher', () => {
    expect(
      isAssignedOrAdmin('t1', { teacherProfileId: 't2', role: 'TEACHER' }),
    ).toBe(false);
  });
});
