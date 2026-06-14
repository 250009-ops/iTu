"use client";

import { ApiDataShell } from "@/components/shared/api-data-shell";
import { AvailabilityGrid } from "@/components/teacher/availability/availability-grid";
import {
  AvailabilityHeader,
  AvailabilityLegend,
} from "@/components/teacher/availability/availability-header";
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
  const { loading, error } = useTeacherAvailability();

  return (
    <ApiDataShell loading={loading} error={error}>
      <div className="p-4 lg:p-6 xl:p-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <AvailabilityHeader />
          <AvailabilityLegend />
          <AvailabilityGrid />
        </div>
      </div>
    </ApiDataShell>
  );
}
