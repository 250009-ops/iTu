"use client";

import { useState } from "react";
import { Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { updateTeacherAvailability } from "@/lib/api/teachers";
import { getErrorMessage } from "@/lib/api/errors";

type WeeklySlot = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDuration: number;
};

type DayRow = {
  dayOfWeek: number;
  label: string;
  active: boolean;
  startTime: string;
  endTime: string;
};

const DAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function buildRows(weekly: WeeklySlot[]): DayRow[] {
  return DAY_LABELS.map((label, dayOfWeek) => {
    const existing = weekly.find((w) => w.dayOfWeek === dayOfWeek);
    return {
      dayOfWeek,
      label,
      active: Boolean(existing),
      startTime: existing?.startTime ?? "09:00",
      endTime: existing?.endTime ?? "17:00",
    };
  });
}

export function WorkingHoursDialog({
  weekly,
  onClose,
  onDone,
}: {
  weekly: WeeklySlot[];
  onClose: () => void;
  onDone: () => Promise<void> | void;
}) {
  const { toast } = useToast();
  const [rows, setRows] = useState<DayRow[]>(() => buildRows(weekly));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(dayOfWeek: number, patch: Partial<DayRow>) {
    setRows((prev) =>
      prev.map((r) => (r.dayOfWeek === dayOfWeek ? { ...r, ...patch } : r)),
    );
  }

  async function handleSave() {
    const active = rows.filter((r) => r.active);
    const invalid = active.find((r) => r.startTime >= r.endTime);
    if (invalid) {
      setError(`${invalid.label}: start time must be before end time.`);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await updateTeacherAvailability(
        active.map((r) => ({
          dayOfWeek: r.dayOfWeek,
          startTime: r.startTime,
          endTime: r.endTime,
        })),
      );
      toast("Working hours updated", {
        description: `${active.length} day${active.length === 1 ? "" : "s"} active per week.`,
        variant: "success",
      });
      await onDone();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, "Could not save working hours."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-navy">
              <Clock size={18} />
              Weekly working hours
            </h2>
            <p className="mt-0.5 text-sm text-muted">
              Toggle the days you take speaking sessions and set your hours.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto px-6 py-5">
          {rows.map((row) => (
            <div
              key={row.dayOfWeek}
              className="flex items-center gap-3 rounded-xl border border-border px-4 py-3"
            >
              <div className="flex w-32 items-center gap-3">
                <Switch
                  checked={row.active}
                  onChange={(checked) =>
                    update(row.dayOfWeek, { active: checked })
                  }
                />
                <span className="text-sm font-semibold text-navy">
                  {row.label}
                </span>
              </div>
              <div className="flex flex-1 items-center gap-2">
                <Input
                  type="time"
                  value={row.startTime}
                  disabled={!row.active}
                  onChange={(e) =>
                    update(row.dayOfWeek, { startTime: e.target.value })
                  }
                  className="flex-1"
                />
                <span className="text-sm text-muted">to</span>
                <Input
                  type="time"
                  value={row.endTime}
                  disabled={!row.active}
                  onChange={(e) =>
                    update(row.dayOfWeek, { endTime: e.target.value })
                  }
                  className="flex-1"
                />
              </div>
            </div>
          ))}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border px-6 py-4">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} loading={submitting}>
            Save working hours
          </Button>
        </div>
      </div>
    </div>
  );
}
