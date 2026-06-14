"use client";

import Link from "next/link";
import { Check, Mic, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStudentDashboardData } from "@/contexts/student-dashboard-context";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  enrolled: "Upcoming",
  in_progress: "In Progress",
  awaiting_results: "Awaiting Results",
};

export function UpcomingMockCard() {
  const { data } = useStudentDashboardData();
  const upcoming = data?.upcomingMock;

  if (!upcoming) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-border bg-white p-8 text-center shadow-sm">
        <p className="font-semibold text-navy">No upcoming mock</p>
        <p className="mt-1 text-sm text-muted">
          Book a full academic mock to get started.
        </p>
        <Link href="/student/browse" className="mt-4">
          <Button variant="danger">Browse Mocks</Button>
        </Link>
      </div>
    );
  }

  const label = new Date(upcoming.mockDate).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const statusLabel = STATUS_LABELS[upcoming.status] ?? "Scheduled";

  return (
    <div className="flex h-full flex-col rounded-xl bg-navy p-6 text-white shadow-lg">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-amber-400/20 px-3 py-1 text-xs font-semibold text-amber-300">
          {statusLabel}
        </span>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-slate-300">
          {upcoming.package}
        </span>
      </div>

      <h2 className="mt-4 text-xl font-bold sm:text-2xl">{label}</h2>
      <p className="mt-1 text-sm text-slate-400">
        All 4 skills · Computer-delivered IELTS format
      </p>

      <div className="mt-6 flex items-end gap-4 sm:gap-6">
        {[
          { value: String(upcoming.daysUntil).padStart(2, "0"), unit: "Days" },
          { value: String(upcoming.hoursUntil).padStart(2, "0"), unit: "Hrs" },
          { value: String(upcoming.minutesUntil).padStart(2, "0"), unit: "Min" },
        ].map((item) => (
          <div key={item.unit} className="text-center">
            <p className="text-3xl font-bold tabular-nums sm:text-4xl">{item.value}</p>
            <p className="text-xs text-slate-400">{item.unit}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {upcoming.skills.map((skill) => (
          <div
            key={skill.name}
            className={cn(
              "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium",
              skill.status === "completed"
                ? "bg-emerald-500/20 text-emerald-300"
                : skill.status === "active"
                  ? "bg-sky-400/20 text-sky-200"
                  : "bg-amber-400/20 text-amber-200",
            )}
          >
            {skill.status === "completed" ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Mic className="h-3.5 w-3.5" />
            )}
            {skill.name}
          </div>
        ))}
      </div>

      <div className="mt-auto flex flex-col gap-2 pt-6 sm:flex-row">
        <Link href="/student/mock-day" className="flex-1">
          <Button className="w-full bg-white text-navy hover:bg-slate-100">
            Open Mock Day Hub
          </Button>
        </Link>
        <Link href="/student/results" className="flex-1">
          <Button
            variant="secondary"
            className="w-full border-white/20 bg-transparent text-white hover:bg-white/10"
          >
            <Trophy className="h-4 w-4" />
            View Results
          </Button>
        </Link>
      </div>
    </div>
  );
}
