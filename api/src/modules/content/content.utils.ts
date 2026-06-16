import { ContentTestType } from '@prisma/client';

export function questionCountForTest(
  type: ContentTestType,
  content: unknown,
): number {
  if (!content || typeof content !== 'object') return 0;
  const c = content as Record<string, unknown>;

  if (typeof c.totalQuestions === 'number') return c.totalQuestions;

  if (type === ContentTestType.WRITING) {
    return Array.isArray(c.tasks) ? c.tasks.length : 0;
  }

  if (type === ContentTestType.SPEAKING) {
    return Array.isArray(c.parts) ? c.parts.length : 0;
  }

  if (type === ContentTestType.LISTENING && Array.isArray(c.parts)) {
    return c.parts.reduce((sum, part) => {
      const groups = (part as { groups?: unknown[] }).groups ?? [];
      return sum + groups.length;
    }, 0);
  }

  if (type === ContentTestType.READING && Array.isArray(c.passages)) {
    return c.passages.reduce((sum, passage) => {
      const groups = (passage as { groups?: unknown[] }).groups ?? [];
      return sum + groups.length;
    }, 0);
  }

  return 0;
}

export function listeningAudioReady(
  content: unknown,
  mediaAssetCount: number,
): boolean {
  if (mediaAssetCount >= 4) return true;
  if (!content || typeof content !== 'object') return false;
  const tracks = (content as { audioTracks?: unknown[] }).audioTracks;
  return Array.isArray(tracks) && tracks.length >= 4;
}

/** Detect scaffold keys (`answer1` … `answerN`) that must be replaced before publish. */
export function isPlaceholderAnswerKey(
  key: Record<string, string | string[]> | null | undefined,
): boolean {
  if (!key || typeof key !== 'object') return true;
  const entries = Object.entries(key);
  if (entries.length === 0) return true;
  return entries.every(
    ([n, v]) => typeof v === 'string' && v === `answer${n}`,
  );
}
