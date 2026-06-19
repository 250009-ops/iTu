"use client";

import { useMemo, useState } from "react";
import { CalendarClock, Clock, Copy, Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { updateTeacherAvailability } from "@/lib/api/teachers";
import { getErrorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

type WeeklySlot = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDuration: number;
};

type DayRow = {
  dayOfWeek: number;
  label: string;
  short: string;
  active: boolean;
  startTime: string;
  endTime: string;
};

const SLOT_MINUTES = 30;

const DAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const DEFAULT_START = "09:00";
const DEFAULT_END = "17:00";

function buildRows(weekly: WeeklySlot[]): DayRow[] {
  return DAY_LABELS.map((label, dayOfWeek) => {
    const existing = weekly.find((w) => w.dayOfWeek === dayOfWeek);
    return {
      dayOfWeek,
      label,
      short: DAY_SHORT[dayOfWeek],
      active: Boolean(existing),
      startTime: existing?.startTime ?? DEFAULT_START,
      endTime: existing?.endTime ?? DEFAULT_END,
    };
  });
}

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
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

  const activeRows = useMemo(() => rows.filter((r) => r.active), [rows]);

  const summary = useMemo(() => {
    let minutes = 0;
    for (const r of activeRows) {
      minutes += Math.max(0, toMinutes(r.endTime) - toMinutes(r.startTime));
    }
    return {
      days: activeRows.length,
      hours: Math.round((minutes / 60) * 10) / 10,
      slots: Math.floor(minutes / SLOT_MINUTES),
    };
  }, [activeRows]);

  function update(dayOfWeek: number, patch: Partial<DayRow>) {
    setRows((prev) =>
      prev.map((r) => (r.dayOfWeek === dayOfWeek ? { ...r, ...patch } : r)),
    );
  }

  function applyPreset(preset: "weekdays" | "everyday" | "clear") {
    setRows((prev) =>
      prev.map((r) => {
        if (preset === "clear") return { ...r, active: false };
        const isWeekday = r.dayOfWeek >= 1 && r.dayOfWeek <= 5;
        const active = preset === "everyday" ? true : isWeekday;
        return {
          ...r,
          active,
          startTime: active ? DEFAULT_START : r.startTime,
          endTime: active ? DEFAULT_END : r.endTime,
        };
      }),
    );
  }

  function copyToAllActive(source: DayRow) {
    setRows((prev) =>
      prev.map((r) =>
        r.active
          ? { ...r, startTime: source.startTime, endTime: source.endTime }
          : r,
      ),
    );
    toast("Hours copied", {
      description: `${source.startTime}–${source.endTime} applied to every active day.`,
      variant: "info",
    });
  }

  async function handleSave() {
    const invalid = activeRows.find((r) => r.startTime >= r.endTime);
    if (invalid) {
      setError(`${invalid.label}: start time must be before end time.`);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await updateTeacherAvailability(
        activeRows.map((r) => ({
          dayOfWeek: r.dayOfWeek,
          startTime: r.startTime,
          endTime: r.endTime,
        })),
      );
      const generated =
        result && typeof result.slotsGenerated === "number"
          ? result.slotsGenerated
          : null;
      toast("Working hours saved", {
        description:
          generated != null
            ? `${activeRows.length} day${activeRows.length === 1 ? "" : "s"} active · ${generated} bookable slots opened.`
            : `${activeRows.length} day${activeRows.length === 1 ? "" : "s"} active per week.`,
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
        className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-border px-6 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy/5 text-navy">
              <CalendarClock size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-navy">
                Weekly working hours
              </h2>
              <p className="mt-0.5 text-sm text-muted">
                Pick the days you take speaking sessions and set your hours.
              </p>
            </div>
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

        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-slate-50/60 px-6 py-3">
          <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-muted">
            Quick set
          </span>
          <PresetButton onClick={() => applyPreset("weekdays")}>
            Weekdays 9–5
          </PresetButton>
          <PresetButton onClick={() => applyPreset("everyday")}>
            Every day 9–5
          </PresetButton>
          <PresetButton onClick={() => applyPreset("clear")}>
            Clear all
          </PresetButton>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto px-6 py-4">
          {rows.map((row) => (
            <div
              key={row.dayOfWeek}
              className={cn(
                "flex flex-col gap-3 rounded-xl border px-4 py-3 transition-colors sm:flex-row sm:items-center",
                row.active
                  ? "border-emerald-200 bg-emerald-50/40"
                  : "border-border bg-white",
              )}
            >
              <div className="flex w-full items-center gap-3 sm:w-40">
                <Switch
                  checked={row.active}
                  onChange={(checked) =>
                    update(row.dayOfWeek, { active: checked })
                  }
                />
                <span
                  className={cn(
                    "text-sm font-semibold",
                    row.active ? "text-navy" : "text-slate-400",
                  )}
                >
                  {row.label}
                </span>
              </div>

              {row.active ? (
                <div className="flex flex-1 items-center gap-2">
                  <Input
                    type="time"
                    value={row.startTime}
                    onChange={(e) =>
                      update(row.dayOfWeek, { startTime: e.target.value })
                    }
                    className="flex-1"
                  />
                  <span className="text-sm text-muted">to</span>
                  <Input
                    type="time"
                    value={row.endTime}
                    onChange={(e) =>
                      update(row.dayOfWeek, { endTime: e.target.value })
                    }
                    className="flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => copyToAllActive(row)}
                    title="Copy these hours to all active days"
                    className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-white hover:text-navy"
                  >
                    <Copy size={15} />
                  </button>
                </div>
              ) : (
                <div className="flex flex-1 items-center text-sm text-slate-400">
                  Unavailable
                </div>
              )}
            </div>
          ))}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex items-start gap-2 rounded-lg border border-sky-100 bg-sky-50 px-4 py-3 text-xs text-sky-700">
            <Info size={14} className="mt-0.5 shrink-0" />
            <span>
              Saving opens {SLOT_MINUTES}-minute bookable slots for the next 4
              weeks. Already-booked sessions are never removed.
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border px-6 py-4">
          <div className="flex items-center gap-1.5 text-sm text-muted">
            <Clock size={15} />
            {summary.days === 0 ? (
              <span>No days selected</span>
            ) : (
              <span>
                <span className="font-semibold text-navy">
                  {summary.days} day{summary.days === 1 ? "" : "s"}
                </span>{" "}
                · {summary.hours}h/week · ~{summary.slots} slots
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} loading={submitting}>
              Save working hours
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PresetButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border border-border bg-white px-3 py-1 text-xs font-semibold text-navy transition-colors hover:border-navy hover:bg-navy hover:text-white"
    >
      {children}
    </button>
  );
}
