"use client";

import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Clock,
  Headphones,
  Mic,
  PenLine,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { defaultExamTimers } from "@/lib/admin/constants";
import { useAdminSettings } from "@/contexts/admin-settings-context";
import { cn } from "@/lib/utils";

const timerIcons = {
  headphones: Headphones,
  book: BookOpen,
  pen: PenLine,
  mic: Mic,
  clock: Clock,
  check: CheckCircle2,
  alert: AlertCircle,
};

const iconTones: Record<string, string> = {
  headphones: "bg-sky-100 text-sky-600",
  book: "bg-emerald-100 text-emerald-600",
  pen: "bg-violet-100 text-violet-600",
  mic: "bg-rose-100 text-rose-600",
  clock: "bg-amber-100 text-amber-600",
  check: "bg-slate-100 text-slate-600",
  alert: "bg-rose-100 text-rose-600",
};

export function ExamTimersPanel() {
  const { examTimers, setField } = useAdminSettings();
  const timers = examTimers as Record<string, number>;
  const moduleTimers = defaultExamTimers.slice(0, 4);
  const totalMinutes = moduleTimers.reduce(
    (sum, t) => sum + (timers[t.id] ?? t.minutes),
    0,
  );

  return (
    <div className="p-5 sm:p-6">
      <div>
        <h2 className="font-semibold text-navy">Exam Timers</h2>
        <p className="mt-0.5 text-sm text-muted">
          Duration controls for each module — changes take effect on newly
          scheduled exams.
        </p>
      </div>

      <div className="mt-6 rounded-xl border border-border bg-slate-50 p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">
            Total Exam Duration
          </p>
          <p className="text-lg font-bold text-navy">{totalMinutes} min</p>
        </div>
        <div className="mt-3 flex h-3 overflow-hidden rounded-full">
          {moduleTimers.map((timer) => (
            <div
              key={timer.id}
              className={cn(timer.color)}
              style={{
                width: `${((timers[timer.id] ?? timer.minutes) / totalMinutes) * 100}%`,
              }}
            />
          ))}
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {defaultExamTimers.map((timer) => {
          const Icon = timerIcons[timer.icon];
          return (
            <div
              key={timer.id}
              className="flex items-center justify-between gap-4 rounded-xl border border-border px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                    iconTones[timer.icon],
                  )}
                >
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="font-semibold text-navy">{timer.label}</p>
                  <p className="text-xs text-muted">{timer.hint}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  value={timers[timer.id] ?? timer.minutes}
                  onChange={(e) =>
                    setField("exam_timers", timer.id, Number(e.target.value))
                  }
                  className="h-9 w-16 text-center"
                />
                <span className="text-sm text-muted">min</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-800">
        Timer changes apply to exams scheduled after saving. Currently active
        sessions are not affected.
      </div>
    </div>
  );
}
