"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getAdminReports } from "@/lib/api/admin";
import { mapReports } from "@/lib/api/mappers/admin";
import { useApiQuery } from "@/hooks/use-api-query";
import type { ReportTimeframe } from "@/lib/admin/types";

type ReportsValue = ReturnType<typeof mapReports> & {
  loading: boolean;
  error: string | null;
  timeframe: ReportTimeframe;
  setTimeframe: (timeframe: ReportTimeframe) => void;
};

const AdminReportsContext = createContext<ReportsValue | null>(null);

const emptyReports = mapReports({
  timeframe: "jun",
  period: {
    label: "June",
    revenueLabel: "June revenue",
    examsPeriod: "Completed mocks in June",
  },
  summary: {
    revenueTotal: 0,
    revenueTrend: "—",
    revenueTrendSub: "vs previous period",
    examsDelivered: 0,
    examsTrend: "—",
    avgBandScore: null,
    avgBandTrend: "—",
    satisfaction: null,
    satisfactionSub: "No reviews in period",
    satisfactionTrend: "—",
  },
  monthlyRevenue: [],
  enrollmentFunnel: [],
  bandDistribution: [],
  modulePerformance: [],
  teacherLeaderboard: [],
});

export function AdminReportsProvider({ children }: { children: ReactNode }) {
  const [timeframe, setTimeframe] = useState<ReportTimeframe>("jun");
  const { data, loading, error } = useApiQuery(
    () => getAdminReports(timeframe),
    [timeframe],
  );

  const value = useMemo<ReportsValue>(() => {
    const mapped = data ? mapReports(data) : emptyReports;
    return { ...mapped, loading, error, timeframe, setTimeframe };
  }, [data, loading, error, timeframe]);

  return (
    <AdminReportsContext.Provider value={value}>
      {children}
    </AdminReportsContext.Provider>
  );
}

export function useAdminReports() {
  const ctx = useContext(AdminReportsContext);
  if (!ctx) {
    throw new Error("useAdminReports requires AdminReportsProvider");
  }
  return ctx;
}
