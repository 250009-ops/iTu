import { ContentTestType } from '@prisma/client';

export const LISTENING_FULL_AUDIO_KEY = 'full-audio';
export const WRITING_TASK1_IMAGE_KEY = 'task-1-image';

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
  mediaAssets: { key: string }[],
): boolean {
  if (mediaAssets.some((a) => a.key === LISTENING_FULL_AUDIO_KEY)) {
    return true;
  }

  const partKeys = new Set(
    mediaAssets
      .filter((a) => /^part-[1-4]$/.test(a.key))
      .map((a) => a.key),
  );
  if (partKeys.size >= 4) return true;

  if (!content || typeof content !== 'object') return false;
  const c = content as Record<string, unknown>;
  const tracks = c.audioTracks;
  if (Array.isArray(tracks) && tracks.length > 0) {
    if (tracks.length === 1) {
      const url = (tracks[0] as { url?: string }).url;
      return typeof url === 'string' && url.trim().length > 0;
    }
    return tracks.length >= 4;
  }

  const audioUrl = c.audioUrl;
  return typeof audioUrl === 'string' && audioUrl.trim().length > 0;
}

export function writingTask1ImageReady(
  content: unknown,
  mediaAssets: { key: string }[],
): boolean {
  if (mediaAssets.some((a) => a.key === WRITING_TASK1_IMAGE_KEY)) {
    return true;
  }
  if (!content || typeof content !== 'object') return false;
  const c = content as Record<string, unknown>;
  const tasks = c.tasks;
  if (!Array.isArray(tasks)) return false;
  const task1 = tasks.find(
    (t) =>
      typeof t === 'object' &&
      t !== null &&
      (t as { taskNumber?: number }).taskNumber === 1,
  ) as { visual?: { imageUrl?: string; kind?: string } } | undefined;
  if (!task1?.visual?.kind) return true;
  const url = task1.visual.imageUrl;
  return typeof url === 'string' && url.trim().length > 0;
}

/** Merge uploaded Task 1 image from media assets into content when JSON lacks imageUrl. */
export function injectWritingTask1ImageUrl(
  content: unknown,
  mediaAssets: { key: string; url: string; sizeBytes?: number | null }[],
): unknown {
  const asset = mediaAssets.find((a) => a.key === WRITING_TASK1_IMAGE_KEY);
  if (!asset?.url?.trim() || !content || typeof content !== 'object') {
    return content;
  }
  const baseUrl = asset.url.split('?')[0]!;
  const c = content as Record<string, unknown>;
  const tasks = c.tasks;
  if (!Array.isArray(tasks)) return content;

  const nextTasks = tasks.map((t) => {
    if (typeof t !== 'object' || t === null) return t;
    const task = t as {
      taskNumber?: number;
      visual?: { imageUrl?: string; kind?: string };
    };
    if (task.taskNumber !== 1 || !task.visual?.kind) return t;

    const existing = task.visual.imageUrl?.trim();
    const resolvedBase = existing ? existing.split('?')[0]! : baseUrl;
    const imageUrl =
      asset.sizeBytes != null
        ? `${resolvedBase}?v=${asset.sizeBytes}`
        : existing || asset.url;

    return {
      ...task,
      visual: { ...task.visual, imageUrl },
    };
  });

  return { ...c, tasks: nextTasks };
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
