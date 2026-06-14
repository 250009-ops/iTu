"use client";

import Link from "next/link";
import { Activity, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAdminDashboard } from "@/contexts/admin-dashboard-context";

export function DashboardHeader() {
  const { meta } = useAdminDashboard();
  const { date, status, lastSync, disputeAlert } = meta;

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <p className="text-xs font-medium text-muted">Admin &gt; Dashboard</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-navy sm:text-3xl">
          Admin Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted">
          {date} · {status} · Last sync {lastSync}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {disputeAlert && (
          <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-800">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {disputeAlert}
          </div>
        )}
        <Link href="/admin/sessions">
          <Button variant="primary" size="sm">
            <Activity className="h-4 w-4" />
            Live Monitor
          </Button>
        </Link>
      </div>
    </div>
  );
}
