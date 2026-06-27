import {
  Calendar,
  CheckCircle2,
  Star,
  Target,
} from "lucide-react";
import { useStudentDashboardData } from "@/contexts/student-dashboard-context";
import type { StudentDashboardResponse } from "@/lib/api/students";
import { cn } from "@/lib/utils";

function formatCountdownSub(
  upcoming: NonNullable<StudentDashboardResponse["upcomingMock"]>,
) {
  if (upcoming.mockStarted) {
    return `${upcoming.mockTime} check-in · in session`;
  }
  if (upcoming.daysUntil > 0) {
    return `${upcoming.mockTime} check-in · ${upcoming.daysUntil} day${upcoming.daysUntil === 1 ? "" : "s"}`;
  }
  if (upcoming.hoursUntil > 0 || upcoming.minutesUntil > 0) {
    return `${upcoming.mockTime} check-in · ${upcoming.hoursUntil}h ${upcoming.minutesUntil}m`;
  }
  return `${upcoming.mockTime} check-in · today`;
}

export function StatCards() {
  const { data } = useStudentDashboardData();
  const stats = data?.stats;
  const upcoming = data?.upcomingMock;
  const mocksCompleted = stats?.mocksCompleted ?? 0;

  const bestBand = stats?.currentBestBand;
  const hasBestBand = bestBand != null && bestBand > 0;

  const bestBandSub =
    stats?.bandImprovement && stats.bandImprovement > 0
      ? `+${stats.bandImprovement} from last mock`
      : hasBestBand && mocksCompleted > 0
        ? "Personal best from completed mocks"
        : "Complete a mock to track progress";

  const cards = [
    {
      label: "Current Best Band",
      value: hasBestBand ? bestBand.toFixed(1) : "—",
      sub: bestBandSub,
      icon: Star,
      iconBg: "bg-amber-50 text-amber-600",
      trend:
        stats?.bandImprovement && stats.bandImprovement > 0
          ? `+${stats.bandImprovement}`
          : undefined,
      trendPositive: true,
    },
    {
      label: "Mocks Completed",
      value: String(mocksCompleted),
      sub:
        stats?.upcomingMocks && stats.upcomingMocks > 0
          ? `${stats.upcomingMocks} upcoming mock${stats.upcomingMocks === 1 ? "" : "s"} scheduled`
          : "Book your next mock",
      icon: CheckCircle2,
      iconBg: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Target Band",
      value: stats?.targetBand?.toFixed(1) ?? "—",
      sub: stats?.targetAchieved
        ? "✓ Achieved this session"
        : stats?.targetBand != null
          ? "In progress"
          : "Set your goal in Profile",
      icon: Target,
      iconBg: "bg-sky-50 text-sky-600",
      subHighlight: stats?.targetAchieved,
    },
    {
      label: "Next Mock",
      value: upcoming
        ? new Date(upcoming.mockDate).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })
        : "—",
      sub: upcoming ? formatCountdownSub(upcoming) : "No mock scheduled",
      icon: Calendar,
      iconBg: "bg-violet-50 text-violet-600",
    },
  ] as const;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((stat) => (
        <div
          key={stat.label}
          className="rounded-xl border border-border bg-white p-5 shadow-sm"
        >
          <div className="flex items-start justify-between">
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg",
                stat.iconBg,
              )}
            >
              <stat.icon className="h-5 w-5" strokeWidth={1.75} />
            </div>
            {"trend" in stat && stat.trend && (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                {stat.trend}
              </span>
            )}
          </div>
          <p className="mt-4 text-3xl font-bold tracking-tight text-navy">
            {stat.value}
          </p>
          <p className="mt-1 text-sm font-medium text-foreground">{stat.label}</p>
          <p
            className={cn(
              "mt-0.5 text-xs",
              "subHighlight" in stat && stat.subHighlight
                ? "font-medium text-emerald-600"
                : "text-muted",
            )}
          >
            {stat.sub}
          </p>
        </div>
      ))}
    </div>
  );
}
