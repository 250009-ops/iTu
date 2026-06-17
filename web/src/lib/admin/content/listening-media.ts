/** Single master audio file for an entire listening test (all 4 parts). */
export const LISTENING_FULL_AUDIO_KEY = "full-audio";

export type MediaAssetRef = { key: string; url?: string; sizeBytes?: number | null };

/** Mirrors API listeningAudioReady — media rows OR legacy audioTracks/audioUrl in content. */
export function listeningMediaReady(
  assets: MediaAssetRef[],
  content?: object,
): boolean {
  if (assets.some((a) => a.key === LISTENING_FULL_AUDIO_KEY)) return true;
  if ([1, 2, 3, 4].every((n) => assets.some((a) => a.key === `part-${n}`))) {
    return true;
  }

  if (!content || typeof content !== "object") return false;
  const c = content as Record<string, unknown>;
  const tracks = c.audioTracks;
  if (Array.isArray(tracks) && tracks.length > 0) {
    if (tracks.length === 1) {
      const url = (tracks[0] as { url?: string }).url;
      return typeof url === "string" && url.trim().length > 0;
    }
    return tracks.length >= 4;
  }

  const audioUrl = c.audioUrl;
  return typeof audioUrl === "string" && audioUrl.trim().length > 0;
}

export function getListeningAudioAsset(
  assets: MediaAssetRef[],
): MediaAssetRef | undefined {
  return (
    assets.find((a) => a.key === LISTENING_FULL_AUDIO_KEY) ??
    assets.find((a) => a.key === "part-1")
  );
}
