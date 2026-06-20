"use client";

import { ApiDataShell } from "@/components/shared/api-data-shell";
import { SchedulePreviewGrid } from "@/components/teacher/availability/schedule-preview-grid";
import { UpcomingBookingsPanel } from "@/components/teacher/availability/upcoming-bookings-panel";
import { WeeklyWorkingHoursPanel } from "@/components/teacher/availability/weekly-working-hours-panel";
import {
  TeacherAvailabilityProvider,
  useTeacherAvailability,
} from "@/contexts/teacher-availability-context";

export function AvailabilityView() {
  return (
    <TeacherAvailabilityProvider>
      <AvailabilityContent />
    </TeacherAvailabilityProvider>
  );
}

function AvailabilityContent() {
  const { loading, error, availability } = useTeacherAvailability();
  const { stats } = availability;

  return (
    <ApiDataShell loading={loading} error={error}>
      <div className="p-4 lg:p-6 xl:p-8">
        <div className="mx-auto max-w-[1440px] space-y-5">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">
                Availability
              </h1>
              <p className="mt-1 text-sm text-muted">
                Define your recurring weekly schedule and see bookings in
                context.
              </p>
            </div>
            <p className="text-sm text-muted">
              <span className="font-semibold text-emerald-600">
                {stats.open} open
              </span>
              {" · "}
              <span className="font-semibold text-sky-600">
                {stats.booked} booked
              </span>
              {" · "}
              <span className="font-semibold text-slate-500">
                {stats.daysOff} days off
              </span>
            </p>
          </header>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[320px_minmax(0,1fr)_240px]">
            <WeeklyWorkingHoursPanel />
            <SchedulePreviewGrid />
            <UpcomingBookingsPanel />
          </div>
        </div>
      </div>
    </ApiDataShell>
  );
}
