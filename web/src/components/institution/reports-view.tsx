"use client";

import { useState } from "react";
import { getCohortReport } from "@/lib/api/institution";
import { useApiQuery } from "@/hooks/use-api-query";
import { cn } from "@/lib/utils";
import {
  EmptyState,
  LoadingRow,
  PageHeader,
  SectionCard,
  StatCard,
} from "@/components/institution/ui";

const RANGES = [
  { id: "3m", label: "3 months" },
  { id: "6m", label: "6 months" },
  { id: "all", label: "All time" },
] as const;

type RangeId = (typeof RANGES)[number]["id"];

export function InstitutionReportsView() {
  const [range, setRange] = useState<RangeId>("6m");
  const { data, loading } = useApiQuery(() => getCohortReport(range), [range]);

  const maxDist = Math.max(1, ...(data?.bandDistribution.map((d) => d.count) ?? [1]));
  const skills = data
    ? [
        { label: "Listening", value: data.skillAverages.listening },
        { label: "Reading", value: data.skillAverages.reading },
        { label: "Writing", value: data.skillAverages.writing },
        { label: "Speaking", value: data.skillAverages.speaking },
      ]
    : [];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 lg:p-6">
      <PageHeader
        breadcrumb="Institution &gt; Reports"
        title="Cohort Reports"
        description="Band outcomes and improvement across your students."
        actions={
          <div className="flex rounded-lg border border-border bg-white p-1">
            {RANGES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRange(r.id)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-semibold transition",
                  range === r.id
                    ? "bg-navy text-white"
                    : "text-muted hover:bg-slate-100",
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Students tested"
          value={data?.summary.studentsTested ?? "—"}
        />
        <StatCard
          label="Avg overall band"
          value={
            data?.summary.avgOverallBand != null
              ? data.summary.avgOverallBand.toFixed(1)
              : "—"
          }
          accent="emerald"
        />
        <StatCard
          label="Avg improvement"
          value={
            data?.summary.avgImprovement != null
              ? `${data.summary.avgImprovement > 0 ? "+" : ""}${data.summary.avgImprovement.toFixed(1)}`
              : "—"
          }
          accent="violet"
        />
        <StatCard
          label="Mocks delivered"
          value={data?.summary.mocksDelivered ?? "—"}
          accent="navy"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard title="Band distribution">
          {loading ? (
            <LoadingRow />
          ) : !data?.bandDistribution.some((d) => d.count > 0) ? (
            <EmptyState message="No released results in this range." />
          ) : (
            <div className="space-y-2 p-5">
              {data.bandDistribution.map((d) => (
                <div key={d.band} className="flex items-center gap-3">
                  <span className="w-8 text-xs font-semibold text-muted">
                    {d.band.toFixed(1)}
                  </span>
                  <div className="h-5 flex-1 overflow-hidden rounded bg-slate-100">
                    <div
                      className="h-full rounded bg-navy"
                      style={{ width: `${(d.count / maxDist) * 100}%` }}
                    />
                  </div>
                  <span className="w-6 text-right text-xs text-muted">
                    {d.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Skill averages">
          {loading ? (
            <LoadingRow />
          ) : (
            <div className="space-y-3 p-5">
              {skills.map((s) => (
                <div key={s.label} className="flex items-center gap-3">
                  <span className="w-20 text-xs font-medium text-navy">
                    {s.label}
                  </span>
                  <div className="h-5 flex-1 overflow-hidden rounded bg-slate-100">
                    <div
                      className="h-full rounded bg-brand-red"
                      style={{ width: `${((s.value ?? 0) / 9) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-xs font-semibold text-navy">
                    {s.value != null ? s.value.toFixed(1) : "—"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Band trend">
        {loading ? (
          <LoadingRow />
        ) : !data?.trend.length ? (
          <EmptyState message="Not enough data to show a trend." />
        ) : (
          <div className="flex items-end gap-3 overflow-x-auto p-5">
            {data.trend.map((t) => (
              <div key={t.month} className="flex flex-col items-center gap-2">
                <div className="flex h-40 items-end">
                  <div
                    className="w-10 rounded-t bg-navy"
                    style={{ height: `${(t.avgBand / 9) * 100}%` }}
                    title={`${t.avgBand.toFixed(1)}`}
                  />
                </div>
                <span className="text-[10px] font-semibold text-navy">
                  {t.avgBand.toFixed(1)}
                </span>
                <span className="text-[10px] text-muted">{t.month}</span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Top performers">
        {loading ? (
          <LoadingRow />
        ) : !data?.topPerformers.length ? (
          <EmptyState message="No performer data yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-5 py-3 font-medium">Student</th>
                  <th className="px-5 py-3 font-medium">Start</th>
                  <th className="px-5 py-3 font-medium">Latest</th>
                  <th className="px-5 py-3 font-medium">Improvement</th>
                  <th className="px-5 py-3 font-medium">Mocks</th>
                </tr>
              </thead>
              <tbody>
                {data.topPerformers.map((p) => (
                  <tr key={p.name} className="border-b border-border last:border-0">
                    <td className="px-5 py-3 font-medium text-navy">{p.name}</td>
                    <td className="px-5 py-3 text-muted">
                      {p.startBand.toFixed(1)}
                    </td>
                    <td className="px-5 py-3 text-muted">
                      {p.latestBand.toFixed(1)}
                    </td>
                    <td
                      className={cn(
                        "px-5 py-3 font-bold",
                        p.improvement >= 0 ? "text-emerald-600" : "text-rose-600",
                      )}
                    >
                      {p.improvement > 0 ? "+" : ""}
                      {p.improvement.toFixed(1)}
                    </td>
                    <td className="px-5 py-3 text-muted">{p.mocks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
