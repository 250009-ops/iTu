"use client";

import {
  VideoTrack,
  useConnectionQualityIndicator,
  useLocalParticipant,
  useTracks,
  TrackToggle,
} from "@livekit/components-react";
import { Track, type Participant } from "livekit-client";
import {
  Mic,
  Signal,
  SignalHigh,
  SignalLow,
  SignalMedium,
  Video,
} from "lucide-react";
import { useSpeakingRoom } from "@/contexts/speaking-room-context";
import { cn } from "@/lib/utils";

function QualityBadge({ participant }: { participant: Participant }) {
  const { quality } = useConnectionQualityIndicator({ participant });
  const Icon =
    quality === "excellent" || quality === "good"
      ? SignalHigh
      : quality === "poor"
        ? SignalLow
        : SignalMedium;

  const label =
    quality === "excellent"
      ? "Excellent quality"
      : quality === "good"
        ? "Good quality"
        : quality === "poor"
          ? "Poor connection"
          : "Checking connection";

  return (
    <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300">
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

export function SpeakingVideoLayout({
  remoteLabel,
  localLabel,
  remotePlaceholder,
  localPlaceholder,
  overlay,
}: {
  remoteLabel: string;
  localLabel: string;
  remotePlaceholder: string;
  localPlaceholder: string;
  overlay?: React.ReactNode;
}) {
  const { remoteParticipant, isConnected } = useSpeakingRoom();
  const { localParticipant } = useLocalParticipant();

  const cameraTracks = useTracks([Track.Source.Camera], {
    onlySubscribed: false,
  });

  const remoteTrack = cameraTracks.find(
    (t) => t.participant.identity === remoteParticipant?.identity,
  );
  const localTrack = cameraTracks.find(
    (t) => t.participant.identity === localParticipant.identity,
  );

  return (
    <div className="relative flex min-h-[320px] flex-1 flex-col overflow-hidden rounded-xl bg-navy lg:min-h-[480px]">
      <div className="absolute left-4 top-4 z-10 flex items-center gap-3">
        {localParticipant && <QualityBadge participant={localParticipant} />}
        {!isConnected && (
          <span className="flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-200">
            <Signal className="h-3.5 w-3.5" />
            Connecting…
          </span>
        )}
      </div>

      <div className="absolute inset-0">
        {remoteTrack ? (
          <VideoTrack
            trackRef={remoteTrack}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-slate-900 text-slate-400">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-700 text-2xl font-bold text-white">
              {remotePlaceholder}
            </div>
            <p className="text-sm">Waiting for participant…</p>
          </div>
        )}
        <span className="absolute left-3 top-12 rounded-md bg-black/50 px-2 py-1 text-[11px] font-medium text-white">
          {remoteLabel}
        </span>
      </div>

      <div className="absolute bottom-4 right-4 z-10 h-28 w-40 overflow-hidden rounded-xl border-2 border-white/20 bg-slate-900 shadow-xl">
        {localTrack ? (
          <VideoTrack
            trackRef={localTrack}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-slate-400">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-700 text-sm font-bold text-white">
              {localPlaceholder}
            </div>
            <p className="text-[10px]">Camera off</p>
          </div>
        )}
        <span className="absolute left-2 top-2 rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white">
          {localLabel}
        </span>
      </div>

      {overlay}
    </div>
  );
}

export function SpeakingControlBar({ className }: { className?: string }) {
  const { role } = useSpeakingRoom();

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-center gap-2 rounded-xl border border-white/10 bg-slate-900/90 px-4 py-3 backdrop-blur",
        className,
      )}
    >
      <TrackToggle
        source={Track.Source.Microphone}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 data-[lk-enabled=true]:bg-emerald-600"
      >
        <Mic className="h-4 w-4" />
      </TrackToggle>

      <TrackToggle
        source={Track.Source.Camera}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 data-[lk-enabled=true]:bg-emerald-600"
      >
        <Video className="h-4 w-4" />
      </TrackToggle>

      <span className="ml-2 text-xs font-medium text-slate-300">
        {role === "examiner" ? "Examiner AV controls" : "Your microphone & camera"}
      </span>
    </div>
  );
}
