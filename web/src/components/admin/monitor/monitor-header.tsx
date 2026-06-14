"use client";

import { Activity, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAdminLiveMonitor } from "@/contexts/admin-live-monitor-context";
import { useToast } from "@/components/ui/toast";

export function MonitorHeader() {
  const { meta, refresh } = useAdminLiveMonitor();
  const { toast } = useToast();

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-xs font-medium text-muted">Admin &gt; Monitor</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-navy sm:text-3xl">
          Live Sessions Monitor
        </h1>
        <p className="mt-1 text-sm text-muted">
          Real-time oversight of all active exams and integrity alerts.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          {meta.sessionsRunning} sessions running
        </span>
        <Button
          variant="secondary"
          size="sm"
          onClick={async () => {
            await refresh();
            toast("Monitor refreshed", {
              description: "Live session data is up to date.",
              variant: "success",
            });
          }}
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>
    </div>
  );
}

export function IntegrityAlertBanner() {
  const { meta } = useAdminLiveMonitor();
  const { toast } = useToast();
  const { flaggedStudents, flaggedCount } = meta;

  if (flaggedCount === 0) return null;

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-rose-200 bg-rose-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="flex gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-600">
          <Activity className="h-5 w-5" />
        </div>
        <div>
          <p className="font-semibold text-rose-900">Integrity Alerts Detected</p>
          <p className="mt-0.5 text-sm text-rose-800">
            {flaggedCount} session{flaggedCount > 1 ? "s" : ""} flagged
            {flaggedStudents.length > 0
              ? `: ${flaggedStudents.join(", ")}. Please review immediately.`
              : "."}
          </p>
        </div>
      </div>
      <Button
        variant="danger"
        size="sm"
        className="shrink-0"
        onClick={() =>
          toast("Flagged sessions", {
            description: `Reviewing ${flaggedCount} flagged session(s).`,
            variant: "warning",
          })
        }
      >
        Review Now
      </Button>
    </div>
  );
}
