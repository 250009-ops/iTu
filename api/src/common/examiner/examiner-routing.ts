/** Portal paths for marketplace vs centre-scoped examiners. */

export function examinerWritingGradingHubPath(
  institutionId: string | null | undefined,
): string {
  return institutionId ? '/inst-examiner/grading' : '/teacher/grading';
}

export function examinerWritingGradingDetailPath(
  institutionId: string | null | undefined,
  submissionId: string,
): string {
  return institutionId
    ? `/inst-examiner/grading/${submissionId}`
    : `/teacher/grading/${submissionId}`;
}

export function examinerSpeakingPath(
  institutionId: string | null | undefined,
  sessionId?: string,
  options?: { live?: boolean },
): string {
  const base = institutionId ? '/inst-examiner/speaking' : '/teacher/speaking';
  if (!sessionId) return base;
  const params = new URLSearchParams({ session: sessionId });
  if (options?.live) params.set('live', '1');
  return `${base}?${params.toString()}`;
}
