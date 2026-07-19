"use client";

import Link from "next/link";
import {
  Camera,
  ClipboardCheck,
  Mic,
  Play,
  Wifi,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useExaminerPaths } from "@/hooks/use-examiner-paths";
import type { MappedSpeakingSessionItem } from "@/lib/api/mappers/teacher";
import {
  formatJoinOpensAt,
  speakingJoinAccess,
} from "@/lib/speaking/slot-access";
import { cn } from "@/lib/utils";

export function NextSessionHero({
  session,
  minutesUntilNext,
}: {
  session: MappedSpeakingSessionItem;
  minutesUntilNext: number | null;
}) {
  const { speaking } = useExaminerPaths();
  const slotAccess = speakingJoinAccess(session.scheduledAt);
  const isAwaitingGrade = session.uiStatus === "awaiting_grade";
  const isLive = session.uiStatus === "live";
  const canEnterLive = slotAccess.allowed && !isAwaitingGrade;

  const countdown =
    minutesUntilNext != null && minutesUntilNext > 0
      ? `${minutesUntilNext} min`
      : isLive
        ? "Now"
        : isAwaitingGrade
          ? "Score"
          : slotAccess.tooEarly && slotAccess.opensAt
            ? formatJoinOpensAt(slotAccess.opensAt)
            : "Soon";

  return (
    <div className="rounded-xl border border-border bg-white p-5 shadow-sm sm:p-6">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
        {isAwaitingGrade ? "Awaiting your grade" : "Next session"}
      </p>
      <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                session.colors.bg,
                session.colors.text,
              )}
            >
              {session.initials}
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-navy">{session.studentName}</h2>
              <p className="mt-0.5 text-sm text-muted">{session.sessionSubtitle}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <ReadinessBadge icon={Wifi} label="Connection ready" />
            <ReadinessBadge icon={Mic} label="Mic detected" />
            <ReadinessBadge icon={Camera} label="Camera on" />
          </div>

          {!slotAccess.allowed && slotAccess.tooEarly && slotAccess.opensAt && (
            <p className="mt-4 text-sm text-amber-800">
              Live console opens at{" "}
              <span className="font-semibold">
                {formatJoinOpensAt(slotAccess.opensAt)}
              </span>{" "}
              (5 minutes before the scheduled start).
            </p>
          )}

          {isAwaitingGrade ? (
            <Link
              href={speaking(session.id)}
              className="mt-5 inline-block"
            >
              <Button variant="danger" size="lg" className="shadow-md">
                <ClipboardCheck className="h-4 w-4" />
                Score now
              </Button>
            </Link>
          ) : (
            <Link
              href={
                canEnterLive
                  ? speaking(session.id, { live: true })
                  : "#"
              }
              className="mt-5 inline-block"
              aria-disabled={!canEnterLive}
              onClick={(e) => {
                if (!canEnterLive) e.preventDefault();
              }}
            >
              <Button
                variant="danger"
                size="lg"
                className="shadow-md"
                disabled={!canEnterLive}
              >
                <Play className="h-4 w-4 fill-current" />
                {canEnterLive
                  ? "Enter live console"
                  : slotAccess.tooEarly
                    ? "Opens soon"
                    : "Session unavailable"}
              </Button>
            </Link>
          )}
        </div>

        <div className="flex items-center gap-4 lg:border-l lg:border-border lg:pl-8">
          <div className="text-left lg:text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
              {isAwaitingGrade ? "Status" : "Starts in"}
            </p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-brand-red">
              {countdown}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReadinessBadge({
  icon: Icon,
  label,
}: {
  icon: typeof Wifi;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}
