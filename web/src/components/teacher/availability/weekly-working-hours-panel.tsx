"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, Globe, Plus, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { useTeacherAvailability } from "@/contexts/teacher-availability-context";
import { updateTeacherAvailability } from "@/lib/api/teachers";
import { getErrorMessage } from "@/lib/api/errors";
import {
  allSpeakingGridTimes,
  ceilSpeakingGridTime,
  floorSpeakingGridTime,
  PLATFORM_DISPLAY_TIMEZONE,
  SPEAKING_SLOT_DURATION_MINUTES,
} from "@/lib/speaking/slot-grid";
import { cn } from "@/lib/utils";

type TimeRange = { id: string; startTime: string; endTime: string };

type DaySchedule = {
  dayOfWeek: number;
  label: string;
  active: boolean;
  ranges: TimeRange[];
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

const DEFAULT_START = "09:00";
const DEFAULT_END = "17:00";
const GRID_TIMES = allSpeakingGridTimes();

function newRange(start = DEFAULT_START, end = DEFAULT_END): TimeRange {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    startTime: ceilSpeakingGridTime(start),
    endTime: floorSpeakingGridTime(end),
  };
}

function buildSchedule(
  weekly: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }[],
): DaySchedule[] {
  return DAY_LABELS.map((label, dayOfWeek) => {
    const entries = weekly.filter((w) => w.dayOfWeek === dayOfWeek);
    return {
      dayOfWeek,
      label,
      active: entries.length > 0,
      ranges:
        entries.length > 0
          ? entries.map((e) =>
              newRange(e.startTime.slice(0, 5), e.endTime.slice(0, 5)),
            )
          : [newRange()],
    };
  });
}

function GridTimeSelect({
  value,
  onChange,
  ariaLabel,
}: {
  value: string;
  onChange: (next: string) => void;
  ariaLabel: string;
}) {
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 flex-1 rounded-lg border border-border bg-white px-2 text-xs font-medium tabular-nums focus:border-navy focus:outline-none"
    >
      {GRID_TIMES.map((t) => (
        <option key={t} value={t}>
          {t}
        </option>
      ))}
    </select>
  );
}

export function WeeklyWorkingHoursPanel() {
  const { availability, refresh } = useTeacherAvailability();
  const { toast } = useToast();
  const [schedule, setSchedule] = useState<DaySchedule[]>(() =>
    buildSchedule(availability.weekly),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSchedule(buildSchedule(availability.weekly));
  }, [availability.weekly]);

  const timezoneLabel = useMemo(() => {
    return `${PLATFORM_DISPLAY_TIMEZONE.replace(/_/g, " ")} (UTC+5) · 20-min slots :00 / :20 / :40`;
  }, []);

  function updateDay(dayOfWeek: number, patch: Partial<DaySchedule>) {
    setSchedule((prev) =>
      prev.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, ...patch } : d)),
    );
  }

  function copyMondayToAll() {
    const monday = schedule.find((d) => d.dayOfWeek === 1);
    if (!monday?.active) {
      toast("Monday is off", {
        description: "Turn on Monday and set hours first.",
        variant: "info",
      });
      return;
    }
    setSchedule((prev) =>
      prev.map((d) =>
        d.dayOfWeek === 0 || d.dayOfWeek === 6
          ? d
          : {
              ...d,
              active: true,
              ranges: monday.ranges.map((r) => ({ ...r, id: newRange().id })),
            },
      ),
    );
    toast("Hours copied", {
      description: "Monday's schedule applied to weekdays.",
      variant: "success",
    });
  }

  async function handleSave() {
    const activeDays = schedule.filter((d) => d.active);
    for (const day of activeDays) {
      for (const range of day.ranges) {
        if (range.startTime >= range.endTime) {
          setError(`${day.label}: start must be before end.`);
          return;
        }
      }
    }

    setSubmitting(true);
    setError(null);
    try {
      const slots = activeDays.flatMap((day) =>
        day.ranges.map((range) => ({
          dayOfWeek: day.dayOfWeek,
          startTime: range.startTime,
          endTime: range.endTime,
        })),
      );
      const result = await updateTeacherAvailability(
        slots,
        SPEAKING_SLOT_DURATION_MINUTES,
      );
      toast("Working hours saved", {
        description:
          result.slotsGenerated != null
            ? `${result.slotsGenerated} bookable slots updated for the next 4 weeks.`
            : "Your weekly schedule has been updated.",
        variant: "success",
      });
      await refresh({ silent: true });
    } catch (err) {
      setError(getErrorMessage(err, "Could not save working hours."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col rounded-xl border border-border bg-white shadow-sm xl:max-h-full">
      <div className="shrink-0 border-b border-border px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-navy">Weekly Working Hours</h2>
            <p className="mt-0.5 text-xs text-muted">
              Set when students can book speaking sessions
            </p>
          </div>
          <button
            type="button"
            onClick={copyMondayToAll}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs font-semibold text-navy transition-colors hover:bg-slate-50"
          >
            <Copy className="h-3.5 w-3.5" />
            Copy Mon → All
          </button>
        </div>

        <div className="mt-3 flex items-center gap-1.5 text-xs text-muted">
          <Globe className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{timezoneLabel}</span>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-4">
        {schedule.map((day) => (
          <div
            key={day.dayOfWeek}
            className={cn(
              "rounded-xl border px-3 py-3 transition-colors",
              day.active
                ? "border-emerald-100 bg-emerald-50/30"
                : "border-border bg-white",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <Switch
                  checked={day.active}
                  onChange={(checked) =>
                    updateDay(day.dayOfWeek, {
                      active: checked,
                      ranges: checked ? day.ranges : [newRange()],
                    })
                  }
                  className={day.active ? "!bg-emerald-500" : undefined}
                  aria-label={`Toggle ${day.label}`}
                />
                <span
                  className={cn(
                    "text-sm font-semibold",
                    day.active ? "text-navy" : "text-slate-400",
                  )}
                >
                  {day.label}
                </span>
              </div>
              {day.active ? (
                <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-200">
                  {day.ranges.length} range{day.ranges.length === 1 ? "" : "s"}
                </span>
              ) : (
                <span className="text-xs font-medium text-slate-400">
                  Day off
                </span>
              )}
            </div>

            {day.active && (
              <div className="mt-3 space-y-2">
                {day.ranges.map((range, index) => (
                  <div key={range.id} className="flex items-center gap-2">
                    <GridTimeSelect
                      ariaLabel={`${day.label} start`}
                      value={range.startTime}
                      onChange={(startTime) => {
                        const next = [...day.ranges];
                        next[index] = { ...range, startTime };
                        updateDay(day.dayOfWeek, { ranges: next });
                      }}
                    />
                    <span className="text-xs text-muted">–</span>
                    <GridTimeSelect
                      ariaLabel={`${day.label} end`}
                      value={range.endTime}
                      onChange={(endTime) => {
                        const next = [...day.ranges];
                        next[index] = { ...range, endTime };
                        updateDay(day.dayOfWeek, { ranges: next });
                      }}
                    />
                    {day.ranges.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          updateDay(day.dayOfWeek, {
                            ranges: day.ranges.filter((r) => r.id !== range.id),
                          })
                        }
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-rose-500"
                        aria-label="Remove range"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    updateDay(day.dayOfWeek, {
                      ranges: [
                        ...day.ranges,
                        newRange(
                          day.ranges[day.ranges.length - 1]?.endTime ??
                            DEFAULT_START,
                          DEFAULT_END,
                        ),
                      ],
                    })
                  }
                  className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-700"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add range
                </button>
              </div>
            )}
          </div>
        ))}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-border p-4">
        <Button
          variant="danger"
          className="w-full"
          loading={submitting}
          onClick={handleSave}
        >
          <Save className="h-4 w-4" />
          Save Changes
        </Button>
      </div>
    </div>
  );
}
