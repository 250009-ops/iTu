"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, TrendingUp } from "lucide-react";
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

type PastMock = StudentDashboardResponse["pastMocks"][number];

const SKILLS: {
  key: "listening" | "reading" | "writing" | "speaking";
  label: string;
  color: string;
}[] = [
  { key: "listening", label: "Listening", color: "#0ea5e9" },
  { key: "reading", label: "Reading", color: "#10b981" },
  { key: "writing", label: "Writing", color: "#8b5cf6" },
  { key: "speaking", label: "Speaking", color: "#f43f5e" },
];

export function InstStudentResultsView() {
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
          setError(getErrorMessage(err, "Could not load your results."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const attempts = useMemo(() => {
    const list = [...(data?.pastMocks ?? [])].filter(
      (m) => m.overall != null,
    );
    list.sort(
      (a, b) => new Date(b.mockDate).getTime() - new Date(a.mockDate).getTime(),
    );
    return list;
  }, [data]);

  const chartData = useMemo(() => {
    return [...attempts]
      .reverse()
      .map((m) => ({
        month: new Date(m.mockDate).toLocaleDateString("en-US", {
          month: "short",
        }),
        overall: m.overall,
        listening: m.listening,
        reading: m.reading,
        writing: m.writing,
        speaking: m.speaking,
      }));
  }, [attempts]);

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
          <p className="font-semibold">Could not load results</p>
          <p className="mt-1">{error}</p>
        </div>
      </div>
    );
  }

  const latest = attempts[0] ?? null;
  const previous = attempts[1] ?? null;
  const delta =
    latest?.overall != null && previous?.overall != null
      ? Math.round((latest.overall - previous.overall) * 10) / 10
      : null;
  const centerName = info?.center?.name ?? "your center";

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8 print:p-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between print:hidden">
        <div>
          <p className="text-xs font-medium text-muted">
            Student Portal · My Results
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-navy sm:text-3xl">
            My Results
          </h1>
          <p className="mt-1 text-sm text-muted">
            All mocks completed through {centerName}
          </p>
        </div>
        {attempts.length > 0 && (
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 self-start rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-navy transition-colors hover:bg-slate-50"
          >
            <Download className="h-4 w-4" />
            Export PDF
          </button>
        )}
      </div>

      {attempts.length === 0 || !latest ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-white p-12 text-center shadow-sm">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
            <TrendingUp className="h-6 w-6" />
          </span>
          <p className="mt-4 font-semibold text-navy">No results yet</p>
          <p className="mt-1 max-w-sm text-sm text-muted">
            Once you complete a mock and {centerName} releases your bands,
            they&apos;ll appear here with a full breakdown.
          </p>
        </div>
      ) : (
        <>
          {/* Latest result hero */}
          <div className="grid grid-cols-1 gap-6 rounded-2xl bg-navy p-6 text-white shadow-sm lg:grid-cols-[240px_1fr] lg:p-8">
            <div className="flex flex-col items-center justify-center">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Latest Result
              </p>
              <div className="relative mt-3 flex h-32 w-32 items-center justify-center rounded-full border-4 border-white/10">
                <div className="text-center">
                  <p className="text-4xl font-bold">
                    {latest.overall?.toFixed(1)}
                  </p>
                  <p className="text-[11px] text-slate-400">overall</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-400">
                {new Date(latest.mockDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
              {delta != null && delta !== 0 && (
                <span
                  className={cn(
                    "mt-2 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                    delta > 0
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-amber-500/20 text-amber-300",
                  )}
                >
                  {delta > 0 ? "+" : ""}
                  {delta} vs previous
                </span>
              )}
            </div>

            <div>
              <p className="text-sm font-semibold">Section Breakdown</p>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {SKILLS.map((s) => {
                  const band = latest[s.key];
                  return (
                    <div
                      key={s.key}
                      className="rounded-xl bg-white/5 p-4"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-300">
                          {s.label}
                        </span>
                        <span className="text-lg font-bold">
                          {band != null ? band.toFixed(1) : "—"}
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${band != null ? (band / 9) * 100 : 0}%`,
                            background: s.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Progress over time */}
          <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
            <div>
              <h3 className="text-sm font-bold text-navy">Progress Over Time</h3>
              <p className="text-xs text-muted">Band trajectory per section</p>
            </div>
            <div className="mt-4">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart
                  data={chartData}
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
                    dataKey="overall"
                    name="Overall"
                    stroke="#1b2a4a"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                  />
                  {SKILLS.map((s) => (
                    <Line
                      key={s.key}
                      type="monotone"
                      dataKey={s.key}
                      name={s.label}
                      stroke={s.color}
                      strokeWidth={1.5}
                      strokeDasharray="4 3"
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* All attempts */}
          <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
            <div className="border-b border-border px-5 py-4">
              <h3 className="text-sm font-bold text-navy">All Attempts</h3>
              <p className="text-xs text-muted">
                {attempts.length} completed mock
                {attempts.length === 1 ? "" : "s"} · sorted newest first
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] font-semibold uppercase tracking-wide text-muted">
                    <th className="px-5 py-3">Mock</th>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Overall</th>
                    <th className="px-5 py-3">Listening</th>
                    <th className="px-5 py-3">Reading</th>
                    <th className="px-5 py-3">Writing</th>
                    <th className="px-5 py-3">Speaking</th>
                    <th className="px-5 py-3">Δ</th>
                  </tr>
                </thead>
                <tbody>
                  {attempts.map((m, i) => (
                    <AttemptRow
                      key={m.id}
                      mock={m}
                      isLatest={i === 0}
                      prev={attempts[i + 1] ?? null}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function AttemptRow({
  mock,
  isLatest,
  prev,
}: {
  mock: PastMock;
  isLatest: boolean;
  prev: PastMock | null;
}) {
  const d =
    mock.overall != null && prev?.overall != null
      ? Math.round((mock.overall - prev.overall) * 10) / 10
      : null;

  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-5 py-3">
        <span className="flex items-center gap-2 font-medium text-navy">
          {mock.enrollmentCode}
          {isLatest && (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700">
              Latest
            </span>
          )}
        </span>
      </td>
      <td className="px-5 py-3 text-muted">
        {new Date(mock.mockDate).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </td>
      <td className="px-5 py-3">
        <span className="inline-flex items-center rounded-md bg-navy px-2 py-0.5 text-xs font-bold text-white">
          {mock.overall?.toFixed(1) ?? "—"}
        </span>
      </td>
      <td className="px-5 py-3 text-navy">{mock.listening?.toFixed(1) ?? "—"}</td>
      <td className="px-5 py-3 text-navy">{mock.reading?.toFixed(1) ?? "—"}</td>
      <td className="px-5 py-3 text-navy">{mock.writing?.toFixed(1) ?? "—"}</td>
      <td className="px-5 py-3 text-navy">{mock.speaking?.toFixed(1) ?? "—"}</td>
      <td className="px-5 py-3">
        {d == null || d === 0 ? (
          <span className="text-xs text-muted">—</span>
        ) : (
          <span
            className={cn(
              "text-xs font-semibold",
              d > 0 ? "text-emerald-600" : "text-amber-600",
            )}
          >
            {d > 0 ? "+" : ""}
            {d}
          </span>
        )}
      </td>
    </tr>
  );
}
