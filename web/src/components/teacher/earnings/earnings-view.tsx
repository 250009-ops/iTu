"use client";

import { ApiDataShell } from "@/components/shared/api-data-shell";
import { EarningsHeader } from "@/components/teacher/earnings/earnings-header";
import { EarningsSummaryCards } from "@/components/teacher/earnings/earnings-summary-cards";
import { MonthlyEarningsChart } from "@/components/teacher/earnings/monthly-earnings-chart";
import { NextPayoutCard } from "@/components/teacher/earnings/next-payout-card";
import { TransactionHistory } from "@/components/teacher/earnings/transaction-history";
import { WeeklyRevenueChart } from "@/components/teacher/earnings/weekly-revenue-chart";
import {
  TeacherEarningsProvider,
  useTeacherEarnings,
} from "@/contexts/teacher-earnings-context";

export function EarningsView() {
  return (
    <TeacherEarningsProvider>
      <EarningsContent />
    </TeacherEarningsProvider>
  );
}

function EarningsContent() {
  const { loading, error } = useTeacherEarnings();

  return (
    <ApiDataShell loading={loading} error={error}>
      <div className="p-4 lg:p-6 xl:p-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <EarningsHeader />
          <EarningsSummaryCards />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <MonthlyEarningsChart />
            </div>
            <div className="lg:col-span-2">
              <WeeklyRevenueChart />
            </div>
          </div>

          <NextPayoutCard />
          <TransactionHistory />
        </div>
      </div>
    </ApiDataShell>
  );
}
