import type { WritingContent } from "@/lib/exam/types";
import type { MediaAssetRef } from "@/lib/admin/content/listening-media";

/** Media key for Writing Task 1 chart/diagram image. */
export const WRITING_TASK1_IMAGE_KEY = "task-1-image";

export function getWritingTask1Asset(
  assets: MediaAssetRef[],
): MediaAssetRef | undefined {
  return assets.find((a) => a.key === WRITING_TASK1_IMAGE_KEY);
}

export function writingTask1ImageReady(
  content: WritingContent,
  assets: MediaAssetRef[],
): boolean {
  const task1 = content.tasks?.find((t) => t.taskNumber === 1);
  if (!task1?.visual?.kind) return true;
  if (task1.visual.imageUrl?.trim()) return true;
  return Boolean(getWritingTask1Asset(assets)?.url);
}

export function resolveTask1ImageUrl(
  content: WritingContent,
  assets: MediaAssetRef[] = [],
): string | undefined {
  const task1 = content.tasks?.find((t) => t.taskNumber === 1);
  const fromContent = task1?.visual?.imageUrl?.trim();
  if (fromContent) return fromContent;
  return getWritingTask1Asset(assets)?.url;
}
