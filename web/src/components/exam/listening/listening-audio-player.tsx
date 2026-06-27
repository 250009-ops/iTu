"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Volume2 } from "lucide-react";
import type { ListeningAudioTrack } from "@/lib/exam/types";
import { logIntegrity } from "@/lib/api/exam";

export type ListeningAudioPlayerHandle = {
  start: () => Promise<boolean>;
};

type Props = {
  tracks: ListeningAudioTrack[];
  sessionId: string;
  /** When true, attempt playback on mount (admin preview). Exam flow should use ref.start() instead. */
  autoPlay?: boolean;
  logIntegrity?: boolean;
  onStatusChange?: (status: string) => void;
  onComplete?: () => void;
  onNeedsUserAction?: (needs: boolean) => void;
};

/** Plays listening audio once per track with seek/rewind/pause disabled (IELTS rules). */
export const ListeningAudioPlayer = forwardRef<ListeningAudioPlayerHandle, Props>(
  function ListeningAudioPlayer(
    {
      tracks,
      sessionId,
      autoPlay = false,
      logIntegrity: logIntegrityEnabled = true,
      onStatusChange,
      onComplete,
      onNeedsUserAction,
    },
    ref,
  ) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [trackIndex, setTrackIndex] = useState(0);
    const [needsUserAction, setNeedsUserAction] = useState(false);
    const maxTimeRef = useRef(0);
    const startedRef = useRef(false);

    const statusForTrack = useCallback(
      (index: number) => {
        const track = tracks[index];
        if (!track) return "Preparing audio…";
        return tracks.length === 1
          ? "Playing listening audio…"
          : `Playing Part ${track.part}`;
      },
      [tracks],
    );

    const startPlayback = useCallback(async (): Promise<boolean> => {
      const audio = audioRef.current;
      if (!audio || !tracks.length) return false;

      maxTimeRef.current = 0;
      setTrackIndex(0);
      audio.src = tracks[0]!.url;
      onStatusChange?.(statusForTrack(0));

      try {
        await audio.play();
        startedRef.current = true;
        setNeedsUserAction(false);
        onNeedsUserAction?.(false);
        return true;
      } catch {
        setNeedsUserAction(true);
        onNeedsUserAction?.(true);
        onStatusChange?.("Tap to start listening audio");
        return false;
      }
    }, [tracks, onStatusChange, onNeedsUserAction, statusForTrack]);

    useImperativeHandle(ref, () => ({ start: startPlayback }), [startPlayback]);

    useEffect(() => {
      if (!autoPlay || !tracks.length || startedRef.current) return;
      void startPlayback();
    }, [autoPlay, tracks, startPlayback]);

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
      onStatusChange?.(statusForTrack(next));
      void audio.play().catch(() => {
        setNeedsUserAction(true);
        onNeedsUserAction?.(true);
        onStatusChange?.("Tap to resume listening audio");
      });
    }

    if (!tracks.length) return null;

    return (
      <>
        <audio
          ref={audioRef}
          preload="auto"
          controls={false}
          controlsList="nodownload noplaybackrate nofullscreen"
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          onPause={() => {
            const audio = audioRef.current;
            if (!audio || audio.ended || needsUserAction) return;
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
        {needsUserAction && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
            <div className="max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                <Volume2 size={24} />
              </div>
              <h3 className="text-lg font-bold text-navy">Start listening audio</h3>
              <p className="mt-2 text-sm text-slate-600">
                Your browser requires a tap to begin playback. Audio plays once only,
                as in the real exam.
              </p>
              <button
                type="button"
                onClick={() => void startPlayback()}
                className="mt-4 w-full rounded-xl bg-brand-red px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-red-hover"
              >
                Start audio
              </button>
            </div>
          </div>
        )}
      </>
    );
  },
);
