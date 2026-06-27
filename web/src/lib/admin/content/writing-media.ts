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

/** Strip cache-bust query params before comparing or storing URLs. */
export function stripMediaCacheBust(url: string): string {
  const q = url.indexOf("?");
  if (q === -1) return url;
  const path = url.slice(0, q);
  const params = new URLSearchParams(url.slice(q + 1));
  params.delete("v");
  const rest = params.toString();
  return rest ? `${path}?${rest}` : path;
}

/** Append a version token so replaced media at the same path bypasses browser/CDN cache. */
export function mediaUrlWithCacheBust(
  url: string | undefined,
  version?: number | string | null,
): string | undefined {
  if (!url?.trim()) return undefined;
  if (version == null) return url;
  const base = stripMediaCacheBust(url);
  return `${base}?v=${encodeURIComponent(String(version))}`;
}

export function resolveTask1ImageUrl(
  content: WritingContent,
  assets: MediaAssetRef[] = [],
  options?: { cacheBust?: boolean },
): string | undefined {
  const task1 = content.tasks?.find((t) => t.taskNumber === 1);
  const asset = getWritingTask1Asset(assets);
  const fromContent = task1?.visual?.imageUrl?.trim();
  const raw = fromContent || asset?.url;
  if (!raw) return undefined;
  if (!options?.cacheBust) return stripMediaCacheBust(raw);
  return mediaUrlWithCacheBust(raw, asset?.sizeBytes ?? raw.length);
}
