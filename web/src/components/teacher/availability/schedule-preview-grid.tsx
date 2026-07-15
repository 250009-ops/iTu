"use client";

import { useState, useRef, type ReactNode } from "react";
import Link from "next/link";
import { Ban, ChevronLeft, ChevronRight, ExternalLink, Loader2, Unlock } from "lucide-react";
import { useTeacherAvailability } from "@/contexts/teacher-availability-context";
import { useToast } from "@/components/ui/toast";
import { blockTeacherSlot, unblockTeacherSlot } from "@/lib/api/teachers";
import { getErrorMessage } from "@/lib/api/errors";
import {
  avatarColorFromName,
  type ScheduleBlock,
  type SlotStatus,
} from "@/lib/api/mappers/teacher";
import { cn } from "@/lib/utils";

const HOUR_HEIGHT = 52;
const GRID_START = 7;
const GRID_END = 18;

const blockStyles: Record<SlotStatus, string> = {
  empty: "",
  available:
    "border border-emerald-200/80 bg-emerald-100 hover:border-emerald-300 hover:bg-emerald-200/80 cursor-pointer",
  booked: "border border-sky-200 bg-sky-100",
  blocked: "border border-slate-300 bg-slate-100 hover:border-slate-400 hover:bg-slate-200/80 cursor-pointer",
};

function BookedSlotTooltip({
  block,
  children,
}: {
  block: ScheduleBlock;
  children: ReactNode;
}) {
  const label = block.studentName ?? "Booked student";

  return (
    <div className="relative flex h-full w-full items-start justify-center">
      {children}
      <div
        role="tooltip"
        className="pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-[100] w-max max-w-[220px] -translate-x-1/2 opacity-0 transition-opacity duration-150 group-hover/booked:opacity-100 group-focus-within/booked:opacity-100"
      >
        <div className="rounded-lg border border-sky-200 bg-white px-3 py-2 shadow-lg">
          <p className="truncate text-xs font-semibold text-navy">{label}</p>
          <p className="mt-0.5 text-[11px] text-muted">
            {block.startLabel}–{block.endLabel}
          </p>
          {block.speakingSessionId ? (
            <Link
              href={`/teacher/speaking?session=${block.speakingSessionId}`}
              className="pointer-events-auto mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-sky-600 hover:text-sky-800 hover:underline"
            >
              Open speaking session
              <ExternalLink className="h-3 w-3" />
            </Link>
          ) : (
            <p className="mt-1 text-[10px] text-muted">Speaking session pending</p>
          )}
        </div>
      </div>
    </div>
  );
}

function ScheduleBlockCell({
  block,
  pending,
  onBlock,
  onUnblock,
}: {
  block: ScheduleBlock;
  pending: boolean;
  onBlock: (() => void) | null;
  onUnblock: (() => void) | null;
}) {
  const top =
    ((block.startMinutes - GRID_START * 60) / 60) * HOUR_HEIGHT;
  const height = Math.max(
    block.status === "booked" ? 28 : 24,
    ((block.endMinutes - block.startMinutes) / 60) * HOUR_HEIGHT - 2,
  );
  const colors = block.studentName
    ? avatarColorFromName(block.studentName)
    : null;

  const interactive = onBlock ?? onUnblock;
  const isBooked = block.status === "booked";

  const cellClassName = cn(
    "absolute inset-x-1 flex items-start justify-center rounded-md px-1 py-0.5 text-left transition-colors",
    blockStyles[block.status],
    isBooked
      ? "group/booked z-20 cursor-default hover:z-[100] focus-within:z-[100] hover:border-sky-300 hover:bg-sky-50"
      : "z-10",
    (block.status === "available" || block.status === "blocked") && "group",
  );

  const cellStyle = { top: `${top}px`, height: `${height}px` };

  const cellContent =
    pending ? (
      <Loader2 className="mx-auto h-4 w-4 animate-spin text-slate-400" />
    ) : isBooked && block.studentInitials && colors ? (
      <BookedSlotTooltip block={block}>
        <div className="relative">
          <div
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold",
              colors.bg,
              colors.text,
            )}
          >
            {block.studentInitials.slice(0, 1)}
          </div>
          <span
            className={cn(
              "absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ring-2 ring-white",
              colors.dot,
            )}
          />
        </div>
      </BookedSlotTooltip>
    ) : block.status === "available" ? (
      <Ban className="h-3 w-3 text-rose-400 opacity-0 transition-opacity group-hover:opacity-100" />
    ) : block.status === "blocked" ? (
      <Unlock className="h-3 w-3 text-emerald-600 opacity-0 transition-opacity group-hover:opacity-100" />
    ) : null;

  if (isBooked) {
    return (
      <div
        style={cellStyle}
        className={cellClassName}
        tabIndex={0}
        aria-label={`${block.studentName ?? "Student"} · ${block.startLabel}–${block.endLabel}`}
      >
        {cellContent}
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={!interactive || pending}
      onClick={interactive ?? undefined}
      title={
        block.status === "available"
          ? `${block.startLabel}–${block.endLabel} · Click to block`
          : block.status === "blocked"
            ? `${block.startLabel}–${block.endLabel} · Click to unblock`
            : `${block.startLabel}–${block.endLabel}`
      }
      style={cellStyle}
      className={cellClassName}
    >
      {cellContent}
    </button>
  );
}

export function SchedulePreviewGrid() {
  const { availability, weekOffset, setWeekOffset, refresh } =
    useTeacherAvailability();
  const { days, stats, label, isCurrentWeek } = availability;
  const { toast } = useToast();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const hours = Array.from(
    { length: GRID_END - GRID_START + 1 },
    (_, i) => GRID_START + i,
  );

  async function refreshPreservingScroll() {
    const scrollTop = scrollRef.current?.scrollTop ?? 0;
    const scrollLeft = scrollRef.current?.scrollLeft ?? 0;
    await refresh({ silent: true });
    requestAnimationFrame(() => {
      if (!scrollRef.current) return;
      scrollRef.current.scrollTop = scrollTop;
      scrollRef.current.scrollLeft = scrollLeft;
    });
  }

  async function handleBlock(slotId: string) {
    setPendingId(slotId);
    try {
      await blockTeacherSlot(slotId);
      toast("Slot blocked", {
        description: "This time is no longer available for booking.",
        variant: "success",
      });
      await refreshPreservingScroll();
    } catch (err) {
      toast("Could not block slot", {
        description: getErrorMessage(err, "Please try again."),
        variant: "error",
      });
    } finally {
      setPendingId(null);
    }
  }

  async function handleUnblock(slotId: string) {
    setPendingId(slotId);
    try {
      await unblockTeacherSlot(slotId);
      toast("Slot unblocked", {
        description: "This time is available for booking again.",
        variant: "success",
      });
      await refreshPreservingScroll();
    } catch (err) {
      toast("Could not unblock slot", {
        description: getErrorMessage(err, "Please try again."),
        variant: "error",
      });
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="flex h-full min-h-[560px] flex-col rounded-xl border border-border bg-white shadow-sm xl:min-h-0 xl:max-h-full">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setWeekOffset((w) => w - 1)}
            className="rounded-lg border border-border p-1.5 text-muted hover:bg-slate-50 hover:text-navy"
            aria-label="Previous week"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="min-w-[140px] text-center">
            <p className="text-sm font-semibold text-navy">
              {isCurrentWeek ? "This week" : "Week view"}
            </p>
            <p className="text-xs text-muted">{label}</p>
          </div>
          <button
            type="button"
            onClick={() => setWeekOffset((w) => w + 1)}
            className="rounded-lg border border-border p-1.5 text-muted hover:bg-slate-50 hover:text-navy"
            aria-label="Next week"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          {weekOffset !== 0 && (
            <button
              type="button"
              onClick={() => setWeekOffset(0)}
              className="ml-1 text-xs font-semibold text-sky-600 hover:underline"
            >
              Today
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="font-semibold text-foreground">{stats.open}</span>{" "}
            open
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-sky-500" />
            <span className="font-semibold text-foreground">{stats.booked}</span>{" "}
            booked
          </span>
          {stats.blocked > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-slate-400" />
              <span className="font-semibold text-foreground">
                {stats.blocked}
              </span>{" "}
              blocked
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-slate-300" />
            <span className="font-semibold text-foreground">
              {stats.daysOff}
            </span>{" "}
            days off
          </span>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-x-auto overflow-y-auto"
      >
        <div className="min-w-[640px]">
          <div className="grid grid-cols-[3.5rem_repeat(7,1fr)] border-b border-border bg-slate-50/80">
            <div />
            {days.map((day) => (
              <div
                key={day.key}
                className={cn(
                  "border-l border-border px-1 py-2 text-center",
                  day.isOff && "bg-slate-50",
                )}
              >
                <p
                  className={cn(
                    "text-xs font-semibold",
                    day.isOff ? "text-slate-400" : "text-navy",
                  )}
                >
                  {day.label} {day.date}
                </p>
                {day.isOff && (
                  <p className="mt-0.5 text-[10px] font-medium text-slate-400">
                    Off
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-[3.5rem_repeat(7,1fr)]">
            <div className="relative border-r border-border">
              {hours.map((hour) => (
                <div
                  key={hour}
                  style={{ height: HOUR_HEIGHT }}
                  className="border-b border-border/60 px-2 pt-1 text-[10px] font-medium tabular-nums text-muted"
                >
                  {hour}:00
                </div>
              ))}
            </div>

            {days.map((day) => (
              <div
                key={day.key}
                className={cn(
                  "relative overflow-visible border-l border-border",
                  day.isOff && "day-off-pattern",
                )}
                style={{ height: hours.length * HOUR_HEIGHT }}
              >
                {!day.isOff &&
                  day.blocks.map((block) => (
                    <ScheduleBlockCell
                      key={block.id}
                      block={block}
                      pending={
                        pendingId !== null &&
                        block.slotIds.includes(pendingId)
                      }
                      onBlock={
                        block.status === "available"
                          ? () => handleBlock(block.slotIds[0]!)
                          : null
                      }
                      onUnblock={
                        block.status === "blocked"
                          ? () => handleUnblock(block.slotIds[0]!)
                          : null
                      }
                    />
                  ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="shrink-0 flex flex-wrap items-center gap-4 border-t border-border px-4 py-2.5 text-[11px] text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-5 rounded border border-emerald-200 bg-emerald-100" />
          Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-5 rounded border border-sky-200 bg-sky-100" />
          Booked (student)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-5 rounded border border-slate-300 bg-slate-100" />
          Blocked
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-5 rounded day-off-pattern border border-slate-200" />
          Day off
        </span>
      </div>
    </div>
  );
}
