/** Keep in sync with api/src/modules/content/content-media.limits.ts */
export const MAX_LISTENING_AUDIO_BYTES = 128 * 1024 * 1024;

export const MAX_LISTENING_AUDIO_MB = 128;

export function isListeningAudioWithinLimit(bytes: number): boolean {
  return bytes > 0 && bytes <= MAX_LISTENING_AUDIO_BYTES;
}
