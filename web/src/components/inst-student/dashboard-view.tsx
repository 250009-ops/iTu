"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronRight,
  CircleHelp,
  Headphones,
  LineChart as LineChartIcon,
  Mic,
  PenLine,
  Play,
  Target,
} from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CHART_AXIS_TICK,
  CHART_GRID_STROKE,
  ChartTooltip,
} from "@/components/ui/chart-tooltip";
import { useInstStudent } from "@/contexts/inst-student-context";
import {
  getStudentDashboard,
  type StudentDashboardResponse,
} from "@/lib/api/students";
import { getErrorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

const SKILL_ICONS: Record<string, typeof Headphones> = {
  Listening: Headphones,
  Reading: BookOpen,
  Writing: PenLine,
  Speaking: Mic,
};

const PROGRESS_SKILLS = [
  { key: "listening", label: "Listening", color: "#0ea5e9" },
  { key: "reading", label: "Reading", color: "#10b981" },
  { key: "writing", label: "Writing", color: "#8b5cf6" },
  { key: "speaking", label: "Speaking", color: "#f43f5e" },
] as const;

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function firstName(name: string): string {
  const parts = name.split(" ").filter(Boolean);
  return parts[parts.length > 1 ? 1 : 0] ?? name;
}

export function InstStudentDashboardView() {
  const { info } = useInstStudent();
  const [data, setData] = useState<StudentDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getStudentDashboard()
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled)
          setError(getErrorMessage(err, "Could not load your dashboard."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const skillSnapshot = useMemo(() => {
    const latest = data?.pastMocks?.find(
      (m) =>
        m.listening != null ||
        m.reading != null ||
        m.writing != null ||
        m.speaking != null,
    );
    return [
      { label: "Listening", band: latest?.listening ?? null, color: "#0ea5e9" },
      { label: "Reading", band: latest?.reading ?? null, color: "#10b981" },
      { label: "Writing", band: latest?.writing ?? null, color: "#8b5cf6" },
      { label: "Speaking", band: latest?.speaking ?? null, color: "#f43f5e" },
    ];
  }, [data]);

  const avgBand = useMemo(() => {
    const overalls = (data?.pastMocks ?? [])
      .map((m) => m.overall)
      .filter((v): v is number => v != null);
    if (overalls.length === 0) return null;
    return (
      Math.round((overalls.reduce((a, b) => a + b, 0) / overalls.length) * 10) /
      10
    );
  }, [data]);

  const bandSeries = useMemo(
    () => (data?.bandProgress ?? []).filter((d) => d.band != null),
    [data],
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-navy border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 lg:p-8">
        <div className="mx-auto max-w-lg rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-800">
          <p className="font-semibold">Could not load your dashboard</p>
          <p className="mt-1">{error}</p>
        </div>
      </div>
    );
  }

  const stats = data?.stats;
  const target = stats?.targetBand ?? null;
  const latest = stats?.currentBestBand ?? null;
  const toGo =
    target != null && latest != null
      ? Math.max(0, Math.round((target - latest) * 10) / 10)
      : null;
  const upcoming = data?.upcomingMock ?? null;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
      {/* Greeting hero */}
      <div className="relative overflow-hidden rounded-2xl bg-navy p-6 text-white lg:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/5" />
        <div className="relative flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <p className="text-xs font-medium text-slate-400">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
              {greeting()}, {firstName(data?.user.name ?? info?.name ?? "there")}
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              {toGo != null && toGo > 0 && target != null
                ? `You're ${toGo} band away from your Band ${target} goal. Keep going!`
                : "Welcome back to your center workspace."}
            </p>
          </div>
          {info?.center && (
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-xs font-bold">
                {info.center.name
                  .split(" ")
                  .map((w) => w[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </span>
              <div className="leading-tight">
                <p className="text-sm font-semibold">{info.center.name}</p>
                <p className="text-[11px] text-amber-300">Your Center</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          value={latest != null ? latest.toFixed(1) : "—"}
          label="Latest Band"
          hint={
            stats && stats.bandImprovement
              ? `${stats.bandImprovement > 0 ? "+" : ""}${stats.bandImprovement} vs prev`
              : "Best overall"
          }
          hintTone={stats && stats.bandImprovement > 0 ? "up" : "muted"}
        />
        <StatCard
          value={target != null ? target.toFixed(1) : "—"}
          label="Target Band"
          hint={toGo != null ? `${toGo} to go` : "Set a goal"}
        />
        <StatCard
          value={String(stats?.mocksCompleted ?? 0)}
          label="Mocks Taken"
          hint={info?.center ? `via ${info.center.name}` : "completed"}
        />
        <StatCard
          value={avgBand != null ? avgBand.toFixed(1) : "—"}
          label="Avg Band"
          hint="across all attempts"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Assigned mock */}
        <div className="lg:col-span-2">
          {upcoming ? (
            <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-border bg-emerald-50/60 px-5 py-2.5">
                <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-emerald-700">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                  Assigned Mock · Ready to start
                </span>
                <span className="text-xs font-semibold text-muted">
                  {upcoming.enrollmentCode}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-navy">
                    {upcoming.package}
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    {new Date(upcoming.mockDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                    {upcoming.writingExaminer || upcoming.speakingExaminer
                      ? ` · Examiner: ${upcoming.writingExaminer ?? upcoming.speakingExaminer}`
                      : ""}
                  </p>
                  {info?.center && (
                    <p className="mt-0.5 text-xs text-muted">
                      {info.center.name}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {upcoming.skills.map((skill) => {
                      const Icon = SKILL_ICONS[skill.name] ?? PenLine;
                      const done = skill.status === "completed";
                      return (
                        <span
                          key={skill.name}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                            done
                              ? "bg-emerald-50 text-emerald-700"
                              : skill.status === "active"
                                ? "bg-sky-50 text-sky-700"
                                : "bg-slate-100 text-slate-500",
                          )}
                        >
                          {done ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <Icon className="h-3 w-3" />
                          )}
                          {skill.name[0]}
                        </span>
                      );
                    })}
                  </div>
                </div>
                <Link
                  href="/inst-student/my-mock"
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-red px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-red-hover"
                >
                  <Play className="h-4 w-4" fill="white" />
                  Enter Mock
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-white p-10 text-center shadow-sm">
              <p className="font-semibold text-navy">No mock assigned yet</p>
              <p className="mt-1 text-sm text-muted">
                {info?.center?.name ?? "Your center"} will assign your next mock
                exam. You&apos;ll be notified by email.
              </p>
            </div>
          )}
        </div>

        {/* Target progress */}
        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-navy">Target Progress</h3>
            <Target className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-4 text-3xl font-bold text-navy">
            {latest != null ? latest.toFixed(1) : "—"}
            <span className="text-base font-medium text-muted">
              {" "}
              / {target != null ? target.toFixed(1) : "—"}
            </span>
          </p>
          <p className="mt-1 text-xs text-muted">
            {toGo != null && toGo > 0
              ? `${toGo} band to reach your target`
              : "Target reached — great work!"}
          </p>
          <div className="mt-4">
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-navy to-brand-red"
                style={{
                  width: `${
                    latest != null
                      ? Math.min(
                          100,
                          Math.max(0, ((latest - 4) / (9 - 4)) * 100),
                        )
                      : 0
                  }%`,
                }}
              />
            </div>
            <div className="mt-1.5 flex justify-between text-[10px] text-muted">
              <span>Band 4.0</span>
              <span>Target {target != null ? target.toFixed(1) : "—"}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Band progress chart */}
        <div className="lg:col-span-2">
          <div className="flex h-full flex-col rounded-2xl border border-border bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-navy">Band Progress</h3>
                <p className="text-xs text-muted">
                  Overall &amp; per-skill bands per attempt
                </p>
              </div>
              {stats && stats.bandImprovement !== 0 && (
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                    stats.bandImprovement > 0
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700",
                  )}
                >
                  {stats.bandImprovement > 0 ? "+" : ""}
                  {stats.bandImprovement} overall
                </span>
              )}
            </div>
            <div className="mt-4 flex-1">
              {bandSeries.length === 0 ? (
                <p className="flex h-40 items-center justify-center text-sm text-muted">
                  Complete mocks to see your progression
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart
                    data={bandSeries}
                    margin={{ left: -8, right: 8, top: 8, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="4 4"
                      stroke={CHART_GRID_STROKE}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="month"
                      tick={CHART_AXIS_TICK}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 9]}
                      ticks={[0, 3, 6, 9]}
                      tick={CHART_AXIS_TICK}
                      axisLine={false}
                      tickLine={false}
                      width={32}
                    />
                    <Tooltip
                      content={<ChartTooltip formatValue={(v) => v.toFixed(1)} />}
                      cursor={{ stroke: "#cbd5e1", strokeWidth: 1 }}
                    />
                    <Legend
                      iconType="circle"
                      wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="band"
                      name="Overall"
                      stroke="#1b2a4a"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: "#1b2a4a", strokeWidth: 0 }}
                      activeDot={{
                        r: 6,
                        fill: "#1b2a4a",
                        stroke: "#fff",
                        strokeWidth: 2,
                      }}
                    />
                    {PROGRESS_SKILLS.map((s) => (
                      <Line
                        key={s.key}
                        type="monotone"
                        dataKey={s.key}
                        name={s.label}
                        stroke={s.color}
                        strokeWidth={1.5}
                        strokeDasharray="4 3"
                        dot={false}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* Skill snapshot + quick links */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
            <h3 className="text-sm font-bold text-navy">Latest Skill Snapshot</h3>
            <div className="mt-4 space-y-3">
              {skillSnapshot.map((s) => (
                <div key={s.label}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted">{s.label}</span>
                    <span className="font-bold text-navy">
                      {s.band != null ? s.band.toFixed(1) : "—"}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${s.band != null ? (s.band / 9) * 100 : 0}%`,
                        background: s.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
            <QuickLink
              href="/inst-student/my-mock"
              icon={Play}
              title="View My Mock"
              subtitle={upcoming ? "Ready to start" : "No active mock"}
            />
            <QuickLink
              href="/inst-student/results"
              icon={LineChartIcon}
              title="See Results"
              subtitle={`${stats?.mocksCompleted ?? 0} completed mock${
                (stats?.mocksCompleted ?? 0) === 1 ? "" : "s"
              }`}
            />
            <QuickLink
              href="/inst-student/help"
              icon={CircleHelp}
              title="Help & Support"
              subtitle="Questions or issues"
              last
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  value,
  label,
  hint,
  hintTone = "muted",
}: {
  value: string;
  label: string;
  hint?: string;
  hintTone?: "up" | "muted";
}) {
  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
      <p className="text-2xl font-bold text-navy sm:text-3xl">{value}</p>
      <p className="mt-1 text-sm font-medium text-navy">{label}</p>
      {hint && (
        <p
          className={cn(
            "mt-0.5 flex items-center gap-1 text-xs",
            hintTone === "up" ? "text-emerald-600" : "text-muted",
          )}
        >
          {hintTone === "up" && <ArrowUpRight className="h-3 w-3" />}
          {hint}
        </p>
      )}
    </div>
  );
}

function QuickLink({
  href,
  icon: Icon,
  title,
  subtitle,
  last,
}: {
  href: string;
  icon: typeof Play;
  title: string;
  subtitle: string;
  last?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 px-5 py-4 transition-colors hover:bg-slate-50",
        !last && "border-b border-border",
      )}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy/5 text-navy">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-navy">{title}</p>
        <p className="text-xs text-muted">{subtitle}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-slate-300" />
    </Link>
  );
}
