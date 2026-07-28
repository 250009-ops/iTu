"use client";

import { useEffect, useMemo, useState } from "react";
import {
  filterBookableSpeakingSlots,
  formatSpeakingWallTime,
  groupSpeakingSlotsByHour,
} from "@/lib/speaking/slot-grid";
import { cn } from "@/lib/utils";

export type SpeakingSlotOption = {
  id: string;
  startsAt: string;
  endsAt?: string;
  status?: string;
};

type Props<T extends SpeakingSlotOption> = {
  slots: T[];
  selectedSlot: T | null;
  onSelect: (slot: T | null) => void;
  disabled?: boolean;
  emptyMessage?: string;
  className?: string;
};

/**
 * Hour first, then only available :00 / :20 / :40 slots in that hour.
 * Hours with zero free on-grid slots are omitted.
 */
export function SpeakingSlotPicker<T extends SpeakingSlotOption>({
  slots,
  selectedSlot,
  onSelect,
  disabled = false,
  emptyMessage = "No open 20-minute slots on this date.",
  className,
}: Props<T>) {
  const hourGroups = useMemo(() => groupSpeakingSlotsByHour(slots), [slots]);
  const bookable = useMemo(() => filterBookableSpeakingSlots(slots), [slots]);

  const selectedHour = selectedSlot
    ? groupSpeakingSlotsByHour([selectedSlot])[0]?.hour
    : undefined;

  const [hour, setHour] = useState<number | "">(
    selectedHour != null ? selectedHour : "",
  );

  useEffect(() => {
    if (selectedHour != null) {
      setHour(selectedHour);
      return;
    }
    if (hour !== "" && !hourGroups.some((g) => g.hour === hour)) {
      setHour("");
    }
  }, [selectedHour, hourGroups, hour]);

  const minuteSlots =
    hour === ""
      ? []
      : (hourGroups.find((g) => g.hour === hour)?.slots ?? []);

  if (bookable.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-navy">
          Available hour
        </label>
        <select
          value={hour === "" ? "" : String(hour)}
          disabled={disabled}
          onChange={(e) => {
            const next = e.target.value === "" ? "" : Number(e.target.value);
            setHour(next);
            onSelect(null);
          }}
          className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm font-medium text-foreground focus:border-navy focus:outline-none disabled:opacity-60"
        >
          <option value="">Select hour…</option>
          {hourGroups.map((group) => (
            <option key={group.hour} value={group.hour}>
              {group.hourLabel} · {group.slots.length} open
            </option>
          ))}
        </select>
      </div>

      {hour !== "" && (
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-navy">
            20-minute slot
          </label>
          {minuteSlots.length === 0 ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              No open slots in this hour.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {minuteSlots.map((slot) => {
                const label = formatSpeakingWallTime(slot.startsAt);
                const active = selectedSlot?.id === slot.id;
                return (
                  <button
                    key={slot.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => onSelect(slot)}
                    className={cn(
                      "rounded-lg border px-4 py-2.5 text-sm font-semibold tabular-nums",
                      active
                        ? "border-rose-500 bg-rose-500 text-white"
                        : "border-border bg-white text-foreground hover:bg-slate-50",
                      disabled && "opacity-60",
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
