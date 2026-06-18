"use client";

import { useEffect, useRef, useState } from "react";
import type { ListeningAudioTrack } from "@/lib/exam/types";
import { logIntegrity } from "@/lib/api/exam";

type Props = {
  tracks: ListeningAudioTrack[];
  sessionId: string;
  /** When false, caller must mount the player to start (admin preview). Default true for exam. */
  autoPlay?: boolean;
  /** Skip integrity API calls (admin preview). */
  logIntegrity?: boolean;
  onStatusChange?: (status: string) => void;
  onComplete?: () => void;
};

/** Plays listening audio once per track with seek/rewind/pause disabled (IELTS rules). */
export function ListeningAudioPlayer({
  tracks,
  sessionId,
  autoPlay = true,
  logIntegrity: logIntegrityEnabled = true,
  onStatusChange,
  onComplete,
}: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [trackIndex, setTrackIndex] = useState(0);
  const maxTimeRef = useRef(0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!autoPlay || !tracks.length || startedRef.current) return;
    const audio = audioRef.current;
    if (!audio) return;

    startedRef.current = true;
    audio.src = tracks[0]!.url;
    onStatusChange?.(
      tracks.length === 1 ? "Playing listening audio…" : `Playing Part ${tracks[0]!.part}`,
    );
    void audio.play().catch(() => {
      onStatusChange?.("Audio unavailable — contact support");
    });
  }, [tracks, onStatusChange, autoPlay]);

  function reportSeek() {
    if (logIntegrityEnabled) {
      void logIntegrity(sessionId, "audio_seek_attempt");
    }
  }

  function handleTimeUpdate() {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.currentTime > maxTimeRef.current + 0.75) {
      audio.currentTime = maxTimeRef.current;
      reportSeek();
      return;
    }
    maxTimeRef.current = Math.max(maxTimeRef.current, audio.currentTime);
  }

  function handleEnded() {
    const next = trackIndex + 1;
    if (next >= tracks.length) {
      onStatusChange?.("Audio complete");
      onComplete?.();
      return;
    }

    const audio = audioRef.current;
    if (!audio) return;

    maxTimeRef.current = 0;
    audio.src = tracks[next]!.url;
    setTrackIndex(next);
    onStatusChange?.(`Playing Part ${tracks[next]!.part}`);
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
      controlsList="nodownload noplaybackrate nofullscreen"
      onTimeUpdate={handleTimeUpdate}
      onEnded={handleEnded}
      onPause={() => {
        const audio = audioRef.current;
        if (!audio || audio.ended) return;
        void audio.play();
      }}
      onSeeking={() => {
        const audio = audioRef.current;
        if (!audio) return;
        if (audio.currentTime < maxTimeRef.current) {
          audio.currentTime = maxTimeRef.current;
          reportSeek();
        }
      }}
      onContextMenu={(e) => e.preventDefault()}
      className="sr-only"
      aria-hidden
    />
  );
}
