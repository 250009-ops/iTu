"use client";

import { memo, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  CheckCircle2,
  Clock,
  Mic,
  RefreshCw,
  ShieldCheck,
  Wifi,
} from "lucide-react";
import { BrandMarkIcon } from "@/components/brand/brand-mark";
import type { SpeakingContent } from "@/lib/exam/types";
import { SpeakingLiveSession } from "@/components/exam/speaking/speaking-live-session";
import { useExamContent } from "@/hooks/use-exam-content";
import { useAuth, getInitials } from "@/hooks/use-auth";
import { ApiDataShell } from "@/components/shared/api-data-shell";
import { SpeakingRoomProvider } from "@/contexts/speaking-room-context";
import { getStudentSpeakingState, type SpeakingState } from "@/lib/api/speaking";
import { useDeviceCheck } from "@/hooks/use-device-check";
import { playExaminerReadyAlert } from "@/lib/speaking/prep-bell";
import {
  formatJoinOpensAt,
  speakingJoinAccess,
} from "@/lib/speaking/slot-access";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

type Stage = "waiting" | "rules" | "live" | "complete";

const RULES = [
  "This session will be recorded for evaluation.",
  "You may ask the examiner to repeat a question in Part 1.",
  "Part 2 includes 1 minute of preparation time.",
  "Do not use notes during the test.",
  "Remain on this page for the full session.",
];

export function SpeakingStudentFlow({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const { content, loading, error } = useExamContent<SpeakingContent>(
    sessionId,
    "speaking",
  );
  const [stage, setStage] = useState<Stage>("waiting");
  const [speakingState, setSpeakingState] = useState<SpeakingState | null>(null);
  const [stateError, setStateError] = useState<string | null>(null);
  const prevExaminerReadyRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function loadState() {
      try {
        const state = await getStudentSpeakingState(sessionId);
        if (!cancelled) {
          setSpeakingState(state);
          setStateError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setStateError(
            err instanceof Error ? err.message : "Failed to load speaking session",
          );
        }
      }
    }

    void loadState();
    const id = window.setInterval(() => void loadState(), 3000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [sessionId]);

  useEffect(() => {
    if (stage !== "waiting") return;
    const ready = speakingState?.examinerReady ?? false;
    if (ready && !prevExaminerReadyRef.current) {
      playExaminerReadyAlert();
      toast("Your examiner is ready", {
        description: "Join your speaking session when your devices are set up.",
        variant: "success",
      });
    }
    prevExaminerReadyRef.current = ready;
  }, [speakingState?.examinerReady, stage, toast]);

  useEffect(() => {
    if (speakingState?.status !== "completed" || stage !== "waiting") return;
    const id = window.setTimeout(() => {
      router.replace("/student/mock-day");
    }, 2000);
    return () => window.clearTimeout(id);
  }, [speakingState?.status, stage, router]);

  if (loading || !content) {
    return <ApiDataShell loading={loading} error={error ?? stateError} />;
  }

  if (stage === "live" && speakingState) {
    return (
      <SpeakingRoomProvider
        speakingSessionId={speakingState.id}
        role="student"
        initialPhase={speakingState.activePhase}
      >
        <SpeakingLiveSession
          sessionId={sessionId}
          content={content}
          onComplete={() => router.replace("/student/mock-day")}
        />
      </SpeakingRoomProvider>
    );
  }

  return (
    <>
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-700 bg-[#1b2a4a] px-4 text-white">
        <div className="flex items-center gap-3">
          <BrandMarkIcon size="md" />
          <span className="text-sm font-semibold">itestu · Speaking</span>
        </div>
        <span className="hidden text-[13px] text-slate-300 sm:block">
          Test taker ID: <span className="font-semibold text-white">{sessionId}</span>
        </span>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto bg-slate-50">
        {stage === "waiting" &&
          (speakingState?.status === "completed" ? (
            <SessionComplete onReturn={() => router.push("/student/mock-day")} />
          ) : (
            <WaitingRoom
              content={content}
              speakingState={speakingState}
              onJoin={() => setStage("rules")}
            />
          ))}
        {stage === "rules" && <RulesConsent onJoin={() => setStage("live")} />}
        {stage === "complete" && (
          <SessionComplete onReturn={() => router.push("/student/mock-day")} />
        )}
      </main>

      <footer className="flex shrink-0 items-center justify-center gap-4 border-t border-slate-200 bg-white px-5 py-3">
        <span className="text-[12px] font-semibold uppercase tracking-wider text-slate-400">
          Full mock progress
        </span>
        <ProgressDots current={stage === "complete" ? "done" : "speaking"} />
      </footer>
    </>
  );
}

function ProgressDots({ current }: { current: "speaking" | "done" }) {
  const items = [
    { key: "L", done: true },
    { key: "R", done: true },
    { key: "W", done: true },
    { key: "S", done: current === "done" },
  ];
  return (
    <div className="flex items-center gap-2">
      {items.map((it) => (
        <span
          key={it.key}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-bold",
            it.done
              ? "bg-emerald-100 text-emerald-700"
              : "bg-rose-100 text-rose-700",
          )}
        >
          {it.done ? <CheckCircle2 size={15} /> : it.key}
        </span>
      ))}
    </div>
  );
}

function WaitingRoom({
  content,
  speakingState,
  onJoin,
}: {
  content: SpeakingContent;
  speakingState: SpeakingState | null;
  onJoin: () => void;
}) {
  const { session: authSession } = useAuth();
  const initials = getInitials(authSession?.name ?? "Student");
  const examinerInitials = getInitials(
    speakingState?.examinerName ?? content.examiner,
  );
  const deviceCheck = useDeviceCheck();
  const examinerReady = speakingState?.examinerReady ?? false;
  const slotAccess = speakingJoinAccess(speakingState?.scheduledAt);
  const canJoin =
    examinerReady &&
    deviceCheck.micOk &&
    deviceCheck.cameraOk &&
    slotAccess.allowed &&
    speakingState?.joinAllowed !== false;

  return (
    <div className="mx-auto max-w-3xl px-5 py-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-navy">
          Speaking Mock — Waiting Room
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Your live examiner session begins shortly. Keep this window open.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-rose-700 text-sm font-bold text-white">
            {examinerInitials}
          </div>
          <div>
            <p className="text-[15px] font-bold text-slate-900">
              {speakingState?.examinerName ?? content.examiner}
            </p>
            <p className="text-[12px] text-slate-500">
              {speakingState?.examinerTitle ?? content.examinerTitle}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-[13px] text-slate-500">
            <Clock size={14} /> {content.slot}
          </span>
          <span
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold",
              examinerReady
                ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-700",
            )}
          >
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                examinerReady ? "bg-emerald-500" : "animate-pulse bg-amber-500",
              )}
            />
            {examinerReady ? "Examiner joined" : "Waiting for examiner"}
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <LocalPreview initials={initials} stream={deviceCheck.previewStream} />
        </div>

        <div className="space-y-3 lg:col-span-2">
          <DeviceRow
            icon={<Mic size={16} />}
            label="Microphone"
            status={
              deviceCheck.checking
                ? "Testing…"
                : deviceCheck.micOk
                  ? "Good"
                  : "Check permissions"
            }
            ok={deviceCheck.micOk}
            meter
            level={deviceCheck.micLevel}
          />
          <DeviceRow
            icon={<Camera size={16} />}
            label="Camera"
            status={
              deviceCheck.checking
                ? "Testing…"
                : deviceCheck.cameraOk
                  ? "Connected"
                  : "Check permissions"
            }
            ok={deviceCheck.cameraOk}
          />
          <DeviceRow
            icon={<Wifi size={16} />}
            label="Connection"
            status={deviceCheck.error ? "Check network" : "Ready for video"}
            ok={!deviceCheck.error}
          />
          <button
            type="button"
            onClick={() => void deviceCheck.runCheck()}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw
              size={14}
              className={cn(deviceCheck.checking && "animate-spin")}
            />
            Run device check again
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-col items-center">
        {!slotAccess.allowed && slotAccess.tooEarly && slotAccess.opensAt && (
          <p className="mb-3 max-w-md text-center text-[13px] text-amber-800">
            Your speaking slot opens at{" "}
            <span className="font-semibold">{formatJoinOpensAt(slotAccess.opensAt)}</span>{" "}
            (5 minutes before the scheduled start). Please wait here.
          </p>
        )}
        {!slotAccess.allowed && slotAccess.tooLate && (
          <p className="mb-3 max-w-md text-center text-[13px] text-rose-700">
            {speakingState?.joinMessage ?? slotAccess.message}
          </p>
        )}
        <button
          type="button"
          disabled={!canJoin}
          onClick={onJoin}
          className="flex items-center gap-2 rounded-xl bg-brand-red px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-red-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ShieldCheck size={16} />
          {!slotAccess.allowed
            ? slotAccess.tooEarly
              ? "Waiting for your scheduled slot"
              : "Session unavailable"
            : examinerReady
              ? "Join session"
              : "Waiting for examiner to be ready"}
        </button>
        <p className="mt-2 text-[12px] text-slate-400">
          You will review the test rules before joining the live video call.
        </p>
      </div>
    </div>
  );
}

const LocalPreview = memo(function LocalPreview({
  initials,
  stream,
}: {
  initials: string;
  stream: MediaStream | null;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!stream) {
      video.srcObject = null;
      return;
    }

    video.srcObject = stream;
    const playPromise = video.play();
    if (playPromise) {
      playPromise.catch((err: DOMException) => {
        if (err.name !== "AbortError") {
          console.warn("Camera preview failed to start:", err);
        }
      });
    }

    return () => {
      video.srcObject = null;
    };
  }, [stream]);

  return (
    <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-900">
      {stream ? (
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          autoPlay
          playsInline
          muted
        />
      ) : (
        <div className="flex flex-col items-center text-slate-400">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-700 text-lg font-bold text-white">
            {initials}
          </div>
          <p className="mt-2 text-[12px]">Self-view camera preview</p>
        </div>
      )}
      <span className="absolute left-3 top-3 rounded-md bg-black/40 px-2 py-1 text-[11px] font-medium text-white">
        You
      </span>
    </div>
  );
});

function DeviceRow({
  icon,
  label,
  status,
  ok,
  meter,
  level = 0,
}: {
  icon: React.ReactNode;
  label: string;
  status: string;
  ok: boolean;
  meter?: boolean;
  level?: number;
}) {
  const filledBars = Math.round((level / 100) * 12);

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-[13px] font-medium text-slate-700">
          <span className="text-slate-400">{icon}</span>
          {label}
        </span>
        <span
          className={cn(
            "text-[12px] font-semibold",
            ok ? "text-emerald-600" : "text-amber-600",
          )}
        >
          {status}
        </span>
      </div>
      {meter && (
        <div className="mt-2 flex gap-0.5">
          {Array.from({ length: 12 }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 flex-1 rounded-full",
                i < filledBars ? "bg-emerald-400" : "bg-slate-200",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function RulesConsent({ onJoin }: { onJoin: () => void }) {
  const [agreed, setAgreed] = useState(false);
  return (
    <div className="mx-auto max-w-xl px-5 py-10">
      <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
        <div className="mb-1 flex items-center gap-2">
          <ShieldCheck size={20} className="text-brand-red" />
          <h1 className="text-xl font-bold text-navy">Speaking Test — Rules</h1>
        </div>
        <p className="mb-5 text-sm text-slate-500">
          Please read the following before joining your examiner on live video.
        </p>

        <ul className="space-y-3">
          {RULES.map((r) => (
            <li key={r} className="flex gap-3 text-[14px] text-slate-700">
              <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-500" />
              {r}
            </li>
          ))}
        </ul>

        <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-[#e31837]"
          />
          <span className="text-[14px] font-medium text-slate-700">
            I agree to the recording and exam rules.
          </span>
        </label>

        <button
          type="button"
          disabled={!agreed}
          onClick={onJoin}
          className="mt-6 w-full rounded-xl bg-brand-red px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-red-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          Join Speaking Test
        </button>
      </div>
    </div>
  );
}

function SessionComplete({ onReturn }: { onReturn: () => void }) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-5 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
        <CheckCircle2 size={32} />
      </div>
      <h1 className="mt-5 text-2xl font-bold text-navy">
        Speaking Test Complete
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        Thank you. Your examiner will finalise your evaluation.
      </p>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white px-6 py-5">
        <p className="text-[13px] text-slate-600">
          Your complete results will be available once all grading is finished.
          You will receive an email notification when your band scores are
          released.
        </p>
      </div>

      <button
        type="button"
        onClick={onReturn}
        className="mt-6 rounded-xl bg-navy px-6 py-3 text-sm font-semibold text-white hover:bg-navy-light"
      >
        Return to Dashboard
      </button>
    </div>
  );
}

