"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReportTimeframe } from "@/lib/admin/types";
import { useToast } from "@/components/ui/toast";
import { useAdminReports } from "@/contexts/admin-reports-context";
import { exportReportsCsv } from "@/lib/admin/export";
import { cn } from "@/lib/utils";

const timeframes: { value: ReportTimeframe; label: string }[] = [
  { value: "jun", label: "Jun" },
  { value: "q2", label: "Q2" },
  { value: "ytd", label: "YTD" },
];

export function ReportsHeader() {
  const [timeframe, setTimeframe] = useState<ReportTimeframe>("jun");
  const { toast } = useToast();
  const { teacherLeaderboard, enrollmentFunnel, revenueExamVolume } =
    useAdminReports();

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-xs font-medium text-muted">Admin &gt; Reports</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-navy sm:text-3xl">
          Reports &amp; Analytics
        </h1>
        <p className="mt-1 text-sm text-muted">
          Revenue · Teacher performance · Band scores · Enrollment trends.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-border bg-white p-0.5">
          {timeframes.map((tf) => (
            <button
              key={tf.value}
              type="button"
              onClick={() => setTimeframe(tf.value)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-semibold transition-colors",
                timeframe === tf.value
                  ? "bg-navy text-white"
                  : "text-muted hover:text-navy",
              )}
            >
              {tf.label}
            </button>
          ))}
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            exportReportsCsv({
              teacherLeaderboard,
              enrollmentFunnel,
              revenueExamVolume,
            });
            toast("Export ready", {
              description: `Report data (${timeframe.toUpperCase()}) downloaded.`,
            });
          }}
        >
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>
    </div>
  );
}
