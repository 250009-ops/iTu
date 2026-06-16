"use client";

import { useEffect, useRef, useState } from "react";
import type { ListeningAudioTrack } from "@/lib/exam/types";
import { logIntegrity } from "@/lib/api/exam";

type Props = {
  tracks: ListeningAudioTrack[];
  sessionId: string;
  onStatusChange?: (status: string) => void;
};

/** Plays listening audio once per track with seek/rewind disabled. */
export function ListeningAudioPlayer({
  tracks,
  sessionId,
  onStatusChange,
}: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [trackIndex, setTrackIndex] = useState(0);
  const maxTimeRef = useRef(0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!tracks.length || startedRef.current) return;
    const audio = audioRef.current;
    if (!audio) return;

    startedRef.current = true;
    audio.src = tracks[0].url;
    onStatusChange?.(`Playing Part ${tracks[0].part}`);
    void audio.play().catch(() => {
      onStatusChange?.("Audio unavailable — contact support");
    });
  }, [tracks, onStatusChange]);

  function handleTimeUpdate() {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.currentTime > maxTimeRef.current + 0.75) {
      audio.currentTime = maxTimeRef.current;
      void logIntegrity(sessionId, "audio_seek_attempt");
      return;
    }
    maxTimeRef.current = Math.max(maxTimeRef.current, audio.currentTime);
  }

  function handleEnded() {
    const next = trackIndex + 1;
    if (next >= tracks.length) {
      onStatusChange?.("Audio complete");
      return;
    }

    const audio = audioRef.current;
    if (!audio) return;

    maxTimeRef.current = 0;
    audio.src = tracks[next].url;
    setTrackIndex(next);
    onStatusChange?.(`Playing Part ${tracks[next].part}`);
    void audio.play().catch(() => {
      onStatusChange?.("Audio playback interrupted");
    });
  }

  if (!tracks.length) return null;

  return (
    <audio
      ref={audioRef}
      preload="auto"
      controls={false}
      onTimeUpdate={handleTimeUpdate}
      onEnded={handleEnded}
      onSeeking={() => {
        const audio = audioRef.current;
        if (!audio) return;
        if (audio.currentTime < maxTimeRef.current) {
          audio.currentTime = maxTimeRef.current;
          void logIntegrity(sessionId, "audio_seek_attempt");
        }
      }}
      className="sr-only"
      aria-hidden
    />
  );
}
