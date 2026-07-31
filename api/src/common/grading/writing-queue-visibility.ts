import { WritingAiEvaluationStatus } from '@prisma/client';
import { areAiFeaturesEnabled } from '../ai/ai-features';

/** True when the AI kill switch is on and an OpenAI key is present. */
export function isOpenAiConfigured(): boolean {
  return (
    areAiFeaturesEnabled() && Boolean(process.env.OPENAI_API_KEY?.trim())
  );
}

/** When AI assist is enabled, teachers only see submissions after analysis finishes. */
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
