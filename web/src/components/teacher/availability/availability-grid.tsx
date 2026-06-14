"use client";

import { useState } from "react";
import { Check, Loader2, Ban } from "lucide-react";
import { useTeacherAvailability } from "@/contexts/teacher-availability-context";
import { useToast } from "@/components/ui/toast";
import { blockTeacherSlot } from "@/lib/api/teachers";
import { getErrorMessage } from "@/lib/api/errors";
import type { DayKey, SlotStatus } from "@/lib/api/mappers/teacher";
import { cn } from "@/lib/utils";

const slotStyles: Record<SlotStatus, string> = {
  empty: "border border-dashed border-slate-200 bg-white",
  available: "border border-emerald-200 bg-emerald-100",
  booked: "border border-sky-200 bg-sky-100",
  blocked: "border border-slate-200 bg-slate-100",
};

function SlotCell({
  status,
  pending,
  onBlock,
}: {
  status: SlotStatus;
  pending: boolean;
  onBlock: (() => void) | null;
}) {
  const interactive = status === "available" && onBlock;
  return (
    <button
      type="button"
      disabled={!interactive || pending}
      onClick={interactive ? onBlock : undefined}
      title={interactive ? "Block this slot" : undefined}
      className={cn(
        "group flex h-10 min-w-[3.5rem] w-full items-center justify-center rounded-lg transition-colors",
        slotStyles[status],
        interactive && "cursor-pointer hover:border-rose-300 hover:bg-rose-50",
      )}
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
      ) : status === "booked" ? (
        <Check className="h-4 w-4 text-sky-600" strokeWidth={2.5} />
      ) : interactive ? (
        <Ban className="h-3.5 w-3.5 text-rose-400 opacity-0 transition-opacity group-hover:opacity-100" />
      ) : null}
    </button>
  );
}

export function AvailabilityGrid() {
  const { availability, refresh } = useTeacherAvailability();
  const { days, timeSlots, getSlotStatus, getSlotId } = availability;
  const { toast } = useToast();
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function handleBlock(slotId: string) {
    setPendingId(slotId);
    try {
      await blockTeacherSlot(slotId);
      toast("Slot blocked", {
        description: "This slot is no longer available for booking.",
        variant: "success",
      });
      await refresh();
    } catch (err) {
      toast("Could not block slot", {
        description: getErrorMessage(err, "Please try again."),
        variant: "error",
      });
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-white shadow-sm">
      <div className="min-w-[640px]">
        <div className="grid grid-cols-[4.5rem_repeat(7,1fr)] border-b border-border bg-slate-50">
          <div className="px-3 py-3 text-xs font-semibold text-muted">Time</div>
          {days.map((day) => (
            <div key={day.key} className="px-2 py-3 text-center">
              <p className="text-xs font-semibold text-navy">{day.label}</p>
              <p className="text-[10px] text-muted">{day.date}</p>
            </div>
          ))}
        </div>

        {timeSlots.map((time) => (
          <div
            key={time}
            className="grid grid-cols-[4.5rem_repeat(7,1fr)] border-b border-border last:border-b-0"
          >
            <div className="flex items-center px-3 py-2 text-xs font-medium tabular-nums text-muted">
              {time}
            </div>
            {days.map((day) => {
              const slotId = getSlotId(time, day.key as DayKey);
              return (
                <div key={day.key} className="p-1.5">
                  <SlotCell
                    status={getSlotStatus(time, day.key as DayKey)}
                    pending={pendingId !== null && pendingId === slotId}
                    onBlock={slotId ? () => handleBlock(slotId) : null}
                  />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
