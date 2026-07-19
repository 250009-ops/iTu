import { WritingAiEvaluationStatus } from '@prisma/client';

export function isOpenAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

/** When AI is enabled, teachers only see submissions after analysis finishes. */
export function isWritingReadyForTeacherQueue(
  aiEvaluation: { status: WritingAiEvaluationStatus } | null | undefined,
): boolean {
  if (!isOpenAiConfigured()) return true;
  if (!aiEvaluation) return false;
  return (
    aiEvaluation.status === WritingAiEvaluationStatus.READY ||
    aiEvaluation.status === WritingAiEvaluationStatus.FAILED
  );
}
