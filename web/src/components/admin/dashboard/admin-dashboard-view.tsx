"use client";

import { CompletionRatesCard } from "@/components/admin/dashboard/completion-rates-card";
import { DashboardHeader } from "@/components/admin/dashboard/dashboard-header";
import { LiveSessionsTable } from "@/components/admin/dashboard/live-sessions-table";
import { RevenueChart } from "@/components/admin/dashboard/revenue-chart";
import { StatCards } from "@/components/admin/dashboard/stat-cards";
import { ApiDataShell } from "@/components/shared/api-data-shell";
import { PortalPage } from "@/components/portal/portal-page";
import {
  AdminDashboardProvider,
  useAdminDashboard,
} from "@/contexts/admin-dashboard-context";

function AdminDashboardContent() {
  const { loading, error } = useAdminDashboard();

  return (
    <ApiDataShell loading={loading} error={error}>
      <PortalPage>
          <DashboardHeader />
          <StatCards />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <RevenueChart />
            </div>
            <div className="lg:col-span-2">
              <CompletionRatesCard />
            </div>
          </div>
          <LiveSessionsTable />
      </PortalPage>
    </ApiDataShell>
  );
}

export function AdminDashboardView() {
  return (
    <AdminDashboardProvider>
      <AdminDashboardContent />
    </AdminDashboardProvider>
  );
}
