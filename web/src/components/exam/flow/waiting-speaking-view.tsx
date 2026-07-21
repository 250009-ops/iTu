"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  CheckCircle2,
  Clock,
  Mic,
  User,
} from "lucide-react";
import type { SpeakingContent } from "@/lib/exam/types";
import { ExamInterstitialHeader } from "@/components/exam/flow/exam-interstitial-header";
import { SpeakingSlotDialog } from "@/components/student/mock-day/speaking-slot-dialog";
import { useExamContent } from "@/hooks/use-exam-content";
import { ApiDataShell } from "@/components/shared/api-data-shell";
import {
  getStudentSpeakingState,
  type SpeakingState,
} from "@/lib/api/speaking";
import {
  formatJoinOpensAt,
  speakingJoinAccess,
} from "@/lib/speaking/slot-access";
import { cn } from "@/lib/utils";

function formatSlotRange(scheduledAt: string) {
  const start = new Date(scheduledAt);
  const end = new Date(start.getTime() + 20 * 60_000);
  const fmt = (d: Date) =>
    d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return `${fmt(start)} – ${fmt(end)}`;
}

export function WaitingSpeakingView({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const { content, loading, error } = useExamContent<SpeakingContent>(
    sessionId,
    "speaking",
  );
  const [speakingState, setSpeakingState] = useState<SpeakingState | null>(null);
  const [stateLoading, setStateLoading] = useState(true);
  const [stateError, setStateError] = useState<string | null>(null);
  const [slotDialogOpen, setSlotDialogOpen] = useState(false);

  const loadState = useCallback(async () => {
    try {
      const state = await getStudentSpeakingState(sessionId);
      setSpeakingState(state);
      setStateError(null);
    } catch (err) {
      setStateError(
        err instanceof Error ? err.message : "Failed to load speaking session",
      );
    } finally {
      setStateLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void loadState();
  }, [loadState]);

  const needsSpeakingSlot = speakingState?.needsSpeakingSlot ?? false;
  const canScheduleSpeakingSlot =
    speakingState?.canScheduleSpeakingSlot ??
    (needsSpeakingSlot && !speakingState?.institutionGranted);
  const isInstitutionPending =
    needsSpeakingSlot && Boolean(speakingState?.institutionGranted);
  const slotAccess = speakingJoinAccess(speakingState?.scheduledAt);
  const slotLabel = speakingState?.scheduledAt
    ? formatSlotRange(speakingState.scheduledAt)
    : content?.slot ?? "Not scheduled";
  const isGrantedPending =
    needsSpeakingSlot &&
    Boolean(speakingState?.adminGranted) &&
    canScheduleSpeakingSlot;
  const mockDayHref = speakingState?.institutionGranted
    ? "/inst-student/my-mock"
    : "/student/mock-day";

  let primaryAction: {
    label: string;
    icon: typeof Mic;
    disabled: boolean;
    onClick: () => void;
  };
  if (isInstitutionPending) {
    primaryAction = {
      label: "Waiting for centre to schedule speaking",
      icon: CalendarClock,
      disabled: true,
      onClick: () => undefined,
    };
  } else if (needsSpeakingSlot && canScheduleSpeakingSlot) {
    primaryAction = {
      label: "Select speaking time",
      icon: CalendarClock,
      disabled: false,
      onClick: () => setSlotDialogOpen(true),
    };
  } else if (slotAccess.tooEarly && slotAccess.opensAt) {
    primaryAction = {
      label: `Join opens at ${formatJoinOpensAt(slotAccess.opensAt)}`,
      icon: Clock,
      disabled: true,
      onClick: () => undefined,
    };
  } else if (slotAccess.tooLate) {
    primaryAction = {
      label: "Speaking join window closed",
      icon: Clock,
      disabled: true,
      onClick: () => undefined,
    };
  } else if (!slotAccess.allowed) {
    primaryAction = {
      label: slotAccess.message ?? "Speaking is not ready yet",
      icon: CalendarClock,
      disabled: true,
      onClick: () => undefined,
    };
  } else {
    primaryAction = {
      label: "Enter Speaking waiting room",
      icon: Mic,
      disabled: false,
      onClick: () => router.push(`/exam/${sessionId}/speaking`),
    };
  }

  if (loading || stateLoading || !content || !speakingState) {
    return (
      <ApiDataShell
        loading={loading || stateLoading}
        error={error ?? stateError}
      />
    );
  }

  const PrimaryIcon = primaryAction.icon;

  return (
    <>
      <ExamInterstitialHeader sessionId={sessionId} label="Mock progress" />
      <main className="min-h-0 flex-1 overflow-y-auto bg-slate-50">
        <div className="mx-auto max-w-2xl px-5 py-10">
          <div className="flex flex-col items-center text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 size={32} />
            </span>
            <h1 className="mt-5 text-2xl font-bold text-navy">
              Writing submitted
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              You have completed the computer-delivered sections. Your final
              section is the live Speaking interview.
            </p>
            {isGrantedPending && (
              <p className="mt-3 max-w-md rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-[13px] text-amber-900">
                Choose a speaking time with your assigned examiner before
                entering the waiting room. This slot cannot be changed later.
              </p>
            )}
            {isInstitutionPending && (
              <p className="mt-3 max-w-md rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-[13px] text-amber-900">
                Your centre assigns the speaking time. Contact your centre admin
                if it is not scheduled yet.
              </p>
            )}
          </div>

          <div className="mt-7 grid grid-cols-4 gap-2">
            {[
              { k: "Listening", done: true },
              { k: "Reading", done: true },
              { k: "Writing", done: true },
              { k: "Speaking", done: false },
            ].map((s) => (
              <div
                key={s.k}
                className="rounded-xl border border-slate-200 bg-white p-3 text-center"
              >
                <span
                  className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-bold ${
                    s.done
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-rose-100 text-rose-700"
                  }`}
                >
                  {s.done ? <CheckCircle2 size={16} /> : "S"}
                </span>
                <p className="mt-1.5 text-[12px] font-medium text-slate-600">
                  {s.k}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border-2 border-rose-200 bg-white p-5">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-600 text-white">
                <Mic size={18} />
              </span>
              <div>
                <p className="text-[15px] font-bold text-slate-900">
                  Speaking interview
                </p>
                <p className="text-[12px] text-slate-500">
                  1-on-1 live session · Parts 1, 2 & 3 · ~20 minutes
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-4 text-[13px] text-slate-600">
              <span className="flex items-center gap-1.5">
                <User size={14} className="text-slate-400" />
                {speakingState?.examinerName ?? content.examiner}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock size={14} className="text-slate-400" />
                {needsSpeakingSlot ? "Not scheduled yet" : slotLabel}
              </span>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              disabled={primaryAction.disabled}
              onClick={primaryAction.onClick}
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold",
                primaryAction.disabled
                  ? "cursor-not-allowed bg-slate-200 text-slate-500"
                  : "bg-brand-red text-white hover:bg-brand-red-hover",
              )}
            >
              <PrimaryIcon size={16} />
              {primaryAction.label}
            </button>
            <button
              type="button"
              onClick={() => router.push(mockDayHref)}
              className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              {speakingState?.institutionGranted
                ? "Back to My Mock"
                : "Back to Mock Day Hub"}
            </button>
          </div>
        </div>
      </main>

      {slotDialogOpen &&
        canScheduleSpeakingSlot &&
        speakingState?.enrollmentId &&
        speakingState.speakingTeacherId && (
          <SpeakingSlotDialog
            enrollmentId={speakingState.enrollmentId}
            mockDateIso={
              speakingState.mockDate ?? new Date().toISOString()
            }
            teacherId={speakingState.speakingTeacherId}
            examinerName={speakingState.examinerName}
            allowFutureDates={Boolean(speakingState.adminGranted)}
            onClose={() => setSlotDialogOpen(false)}
            onDone={() => void loadState()}
          />
        )}
    </>
  );
}
