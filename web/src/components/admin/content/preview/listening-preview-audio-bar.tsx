"use client";

import { useState } from "react";
import { Headphones, Play, Volume2 } from "lucide-react";
import { ListeningAudioPlayer } from "@/components/exam/listening/listening-audio-player";
import type { ListeningAudioTrack } from "@/lib/exam/types";
import { Button } from "@/components/ui/button";

type Props = {
  tracks: ListeningAudioTrack[];
};

/** Admin preview — shows exam-style audio chrome; optional one-shot playback simulation. */
export function ListeningPreviewAudioBar({ tracks }: Props) {
  const [simulating, setSimulating] = useState(false);
  const [status, setStatus] = useState(
    tracks.length > 0 ? "Audio ready" : "No audio uploaded",
  );

  if (tracks.length === 0) {
    return (
      <div className="flex items-start gap-3 border-b border-amber-200 bg-amber-50 px-4 py-3">
        <Headphones className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
        <div>
          <p className="text-sm font-semibold text-amber-900">No listening audio</p>
          <p className="mt-0.5 text-xs text-amber-800">
            Upload the full recording in the Visual editor tab. Students cannot start
            Listening until audio is attached.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {simulating ? (
        <ListeningAudioPlayer
          tracks={tracks}
          sessionId="admin-preview"
          autoPlay
          logIntegrity={false}
          onStatusChange={setStatus}
          onComplete={() => {
            setSimulating(false);
            setStatus("Playback finished — simulate again anytime");
          }}
        />
      ) : null}

      <div className="border-b border-slate-700 bg-[#1b2a4a] px-4 py-3 text-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300">
              <Volume2 className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-emerald-100">{status}</p>
              <p className="text-[11px] text-slate-400">
                {tracks.length === 1
                  ? "One file · all four parts"
                  : `${tracks.length} audio tracks`}
              </p>
            </div>
            {simulating ? (
              <span className="ml-1 flex items-end gap-0.5">
                {[3, 6, 4, 7, 5].map((h, i) => (
                  <span
                    key={i}
                    className="w-0.5 animate-pulse rounded-full bg-emerald-300"
                    style={{ height: `${h}px`, animationDelay: `${i * 120}ms` }}
                  />
                ))}
              </span>
            ) : null}
          </div>

          {!simulating ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-8 border-white/20 bg-white/10 text-white hover:bg-white/20"
              onClick={() => {
                setSimulating(true);
                setStatus("Starting playback…");
              }}
            >
              <Play className="h-3.5 w-3.5" fill="currentColor" />
              Simulate exam playback
            </Button>
          ) : (
            <span className="text-xs font-medium text-emerald-300">
              No controls · cannot rewind
            </span>
          )}
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
          In the real exam the audio starts automatically once, plays through all parts, and
          candidates have no seek or pause controls.
        </p>
      </div>
    </>
  );
}
