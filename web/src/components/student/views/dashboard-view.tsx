"use client";

import { WelcomeSection } from "@/components/student/dashboard/welcome-section";
import { WelcomePromoSection } from "@/components/student/dashboard/welcome-promo-section";
import { ReferralSection } from "@/components/student/dashboard/referral-section";
import { ResultsBanner } from "@/components/student/dashboard/results-banner";
import { MissedMockBanner } from "@/components/student/dashboard/missed-mock-banner";
import { StatCards } from "@/components/student/dashboard/stat-cards";
import { DashboardLeaderboard } from "@/components/student/dashboard/dashboard-leaderboard";
import { RecommendedExaminers } from "@/components/student/dashboard/recommended-examiners";
import { UpcomingMockCard } from "@/components/student/dashboard/upcoming-mock-card";
import { BandProgressChart } from "@/components/student/dashboard/band-progress-chart";
import { PastMocksTable } from "@/components/student/dashboard/past-mocks-table";
import {
  ActivityFeed,
  PreparationTip,
} from "@/components/student/dashboard/activity-sidebar";
import { StudentDashboardProvider, useStudentDashboardData } from "@/contexts/student-dashboard-context";
import { useStudentDashboardExtras } from "@/hooks/use-student-dashboard-extras";

export function DashboardView() {
  return (
    <StudentDashboardProvider>
      <DashboardContent />
    </StudentDashboardProvider>
  );
}

function DashboardContent() {
  const { loading, error } = useStudentDashboardData();
  const {
    leaderboard,
    examiners,
    loading: extrasLoading,
  } = useStudentDashboardExtras();

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-navy border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="mx-auto max-w-lg rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-800">
          <p className="font-semibold">Could not load dashboard</p>
          <p className="mt-1">{error}</p>
          <p className="mt-3 text-xs text-red-600">
            Make sure the API is running at{" "}
            {process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 xl:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <WelcomeSection />
        <WelcomePromoSection />
        <ReferralSection />
        <ResultsBanner />
        <MissedMockBanner />
        <StatCards />

        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
          <DashboardLeaderboard data={leaderboard} loading={extrasLoading} />
          <RecommendedExaminers examiners={examiners} loading={extrasLoading} />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <UpcomingMockCard />
          </div>
          <div className="lg:col-span-2">
            <BandProgressChart />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <PastMocksTable />
          </div>
          <div className="space-y-6">
            <ActivityFeed />
            <PreparationTip />
          </div>
        </div>
      </div>
    </div>
  );
}
