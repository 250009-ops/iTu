"use client";

import { ApiDataShell } from "@/components/shared/api-data-shell";
import { TeacherStatCards } from "@/components/teacher/dashboard/stat-cards";
import { TodaysScheduleCard } from "@/components/teacher/dashboard/todays-schedule-card";
import { TeacherWelcomeSection } from "@/components/teacher/dashboard/welcome-section";
import { WritingQueueCard } from "@/components/teacher/dashboard/writing-queue-card";
import {
  TeacherDashboardProvider,
  useTeacherDashboard,
} from "@/contexts/teacher-dashboard-context";

export function TeacherDashboardView() {
  return (
    <TeacherDashboardProvider>
      <DashboardContent />
    </TeacherDashboardProvider>
  );
}

function DashboardContent() {
  const { loading, error } = useTeacherDashboard();

  return (
    <ApiDataShell loading={loading} error={error}>
      <div className="p-4 lg:p-6 xl:p-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <TeacherWelcomeSection />
          <TeacherStatCards />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <TodaysScheduleCard />
            </div>
            <div className="lg:col-span-2">
              <WritingQueueCard />
            </div>
          </div>
        </div>
      </div>
    </ApiDataShell>
  );
}
