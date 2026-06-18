import {
  LISTENING_FULL_AUDIO_KEY,
  type MediaAssetRef,
} from "@/lib/admin/content/listening-media";
import type { ListeningAudioTrack, ListeningContent } from "@/lib/exam/types";

/** Build playable tracks from uploaded media (mirrors exam API content merge). */
export function buildListeningAudioTracks(
  content: ListeningContent,
  mediaAssets: MediaAssetRef[] = [],
): ListeningAudioTrack[] {
  const full = mediaAssets.find(
    (a) => a.key === LISTENING_FULL_AUDIO_KEY && a.url?.trim(),
  );
  if (full?.url) {
    return [{ part: 1, url: full.url, title: "Full listening test" }];
  }

  const legacy = [1, 2, 3, 4]
    .map((n) => mediaAssets.find((a) => a.key === `part-${n}` && a.url?.trim()))
    .filter((a): a is MediaAssetRef & { url: string } => Boolean(a?.url));

  if (legacy.length > 0) {
    return legacy.map((a, i) => ({
      part: i + 1,
      url: a.url,
      title: `Part ${i + 1}`,
    }));
  }

  if (content.audioTracks?.length) {
    return content.audioTracks.filter((t) => t.url?.trim());
  }

  return content.parts
    .filter((p) => p.audioUrl?.trim())
    .map((p) => ({
      part: p.part,
      url: p.audioUrl!,
      title: p.title,
    }));
}
