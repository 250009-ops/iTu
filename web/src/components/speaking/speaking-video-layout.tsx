"use client";

import {
  VideoTrack,
  useConnectionQualityIndicator,
  useLocalParticipant,
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
import { useCameraTrackRef } from "@/hooks/use-camera-track-ref";
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

function CameraTile({
  trackRef,
  label,
  placeholder,
  className,
  pip,
}: {
  trackRef: ReturnType<typeof useCameraTrackRef>;
  label: string;
  placeholder: string;
  className?: string;
  pip?: boolean;
}) {
  const hasVideo =
    trackRef?.publication?.track &&
    !trackRef.publication.isMuted &&
    trackRef.publication.isEnabled;

  return (
    <div className={cn("relative overflow-hidden bg-slate-900", className)}>
      {hasVideo && trackRef ? (
        <VideoTrack
          trackRef={trackRef}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-400">
          <div
            className={cn(
              "flex items-center justify-center rounded-full bg-slate-700 font-bold text-white",
              pip ? "h-10 w-10 text-sm" : "h-20 w-20 text-2xl",
            )}
          >
            {placeholder}
          </div>
          {!pip && <p className="text-sm">Waiting for participant…</p>}
          {pip && !hasVideo && (
            <p className="text-[10px]">Camera off</p>
          )}
        </div>
      )}
      <span
        className={cn(
          "absolute rounded bg-black/50 font-medium text-white",
          pip ? "left-2 top-2 px-1.5 py-0.5 text-[10px]" : "left-3 top-12 px-2 py-1 text-[11px]",
        )}
      >
        {label}
      </span>
    </div>
  );
}

function RemoteVideoLayer({
  trackRef,
  label,
  placeholder,
  className,
  videoClassName,
}: {
  trackRef: ReturnType<typeof useCameraTrackRef>;
  label: string;
  placeholder: string;
  className?: string;
  videoClassName?: string;
}) {
  const hasVideo =
    trackRef?.publication?.track &&
    !trackRef.publication.isMuted &&
    trackRef.publication.isEnabled;

  return (
    <div className={cn("relative overflow-hidden bg-slate-900", className)}>
      {hasVideo && trackRef ? (
        <VideoTrack
          trackRef={trackRef}
          className={cn("h-full w-full object-cover", videoClassName)}
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-400">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-700 text-2xl font-bold text-white">
            {placeholder}
          </div>
          <p className="text-sm">Waiting for participant…</p>
        </div>
      )}
      <span className="absolute left-3 top-12 rounded bg-black/50 px-2 py-1 text-[11px] font-medium text-white">
        {label}
      </span>
    </div>
  );
}

export function SpeakingVideoLayout({
  remoteLabel,
  localLabel,
  remotePlaceholder,
  localPlaceholder,
  overlay,
  className,
  videoHeightRatio = 1,
  letterboxBlur = false,
  pipClassName,
}: {
  remoteLabel: string;
  localLabel: string;
  remotePlaceholder: string;
  localPlaceholder: string;
  overlay?: React.ReactNode;
  className?: string;
  /** 0–1 height of the sharp video strip; remainder shows blurred ambient fill. */
  videoHeightRatio?: number;
  letterboxBlur?: boolean;
  pipClassName?: string;
}) {
  const { remoteParticipant, isConnected } = useSpeakingRoom();
  const { localParticipant } = useLocalParticipant();

  const remoteTrack = useCameraTrackRef(remoteParticipant);
  const localTrack = useCameraTrackRef(localParticipant);

  const ratio = Math.min(1, Math.max(0.4, videoHeightRatio));
  const letterboxed = letterboxBlur && ratio < 1;

  return (
    <div
      className={cn(
        "relative flex min-h-[320px] flex-1 flex-col overflow-hidden bg-slate-950 lg:min-h-[480px]",
        className,
      )}
    >
      <div className="absolute left-4 top-4 z-10 flex items-center gap-3">
        {localParticipant && <QualityBadge participant={localParticipant} />}
        {!isConnected && (
          <span className="flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-200">
            <Signal className="h-3.5 w-3.5" />
            Connecting…
          </span>
        )}
      </div>

      {letterboxed && remoteTrack && (
        <div className="absolute inset-0 overflow-hidden" aria-hidden>
          <VideoTrack
            trackRef={remoteTrack}
            className="h-full w-full scale-[1.35] object-cover blur-3xl brightness-[0.45] saturate-150"
          />
          <div className="absolute inset-0 bg-slate-950/55" />
          <div className="absolute inset-x-0 top-0 h-1/5 bg-gradient-to-b from-slate-950/80 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-1/5 bg-gradient-to-t from-slate-950/80 to-transparent" />
        </div>
      )}

      <div
        className={cn(
          "absolute inset-x-0 z-[1] overflow-hidden shadow-2xl shadow-black/40",
          letterboxed
            ? "top-1/2 -translate-y-1/2"
            : "inset-y-0",
        )}
        style={letterboxed ? { height: `${ratio * 100}%` } : undefined}
      >
        <RemoteVideoLayer
          trackRef={remoteTrack}
          label={remoteLabel}
          placeholder={remotePlaceholder}
          className="h-full w-full"
        />
      </div>

      <div
        className={cn(
          "absolute z-10 h-28 w-40 overflow-hidden rounded-xl border-2 border-white/20 shadow-xl",
          pipClassName ?? "bottom-4 right-4",
        )}
      >
        <CameraTile
          trackRef={localTrack}
          label={localLabel}
          placeholder={localPlaceholder}
          className="h-full w-full"
          pip
        />
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
