"use client";

import { CurrentStatusBanner } from "@/components/student/mock-day/current-status-banner";
import { ExamRulesBanner } from "@/components/student/mock-day/exam-rules-banner";
import { MockDayEmptyState } from "@/components/student/mock-day/mock-day-empty-state";
import { MockDayMissedState } from "@/components/student/mock-day/mock-day-missed-state";
import { MockDayHeader } from "@/components/student/mock-day/mock-day-header";
import { MockDayLoadingSkeleton } from "@/components/student/mock-day/mock-day-loading-skeleton";
import { MockDayShellHeader } from "@/components/student/mock-day/mock-day-shell-header";
import { MockDaySidebar } from "@/components/student/mock-day/mock-day-sidebar";
import { ScheduleTimeline } from "@/components/student/mock-day/schedule-timeline";
import { SectionCards } from "@/components/student/mock-day/section-cards";
import {
  StudentMockDayProvider,
  useStudentMockDayData,
} from "@/contexts/student-mock-day-context";

export function MockDayView() {
  return (
    <StudentMockDayProvider>
      <MockDayContent />
    </StudentMockDayProvider>
  );
}

function MockDayContent() {
  const { data, loading, error } = useStudentMockDayData();

  if (loading) {
    return <MockDayLoadingSkeleton />;
  }

  if (error) {
    return (
      <div>
        <MockDayShellHeader subtitle="Your exam-day command center" />
        <div className="p-8">
          <div className="mx-auto max-w-lg rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-800">
            <p className="font-semibold">Could not load session details</p>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return <MockDayEmptyState />;
  }

  if (data.status === "missed") {
    return (
      <MockDayMissedState
        packageTitle={data.packageTitle}
        dateLabel={data.dateLabel}
      />
    );
  }

  return (
    <div>
      <MockDayHeader />
      <CurrentStatusBanner />

      <div className="mx-auto max-w-7xl px-6 py-7 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-8">
            <ExamRulesBanner />
            <SectionCards />
          </div>

          <div className="space-y-4 lg:col-span-4">
            <ScheduleTimeline />
            <MockDaySidebar />
          </div>
        </div>
      </div>
    </div>
  );
}
