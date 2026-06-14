"use client";

import { useState } from "react";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTeacherAvailability } from "@/contexts/teacher-availability-context";
import { WorkingHoursDialog } from "@/components/teacher/availability/working-hours-dialog";

export function AvailabilityHeader() {
  const { availability, refresh } = useTeacherAvailability();
  const { label, stats, weekly } = availability;
  const [editorOpen, setEditorOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">
          Availability Calendar
        </h1>
        <p className="mt-1 text-sm text-muted">{label}</p>
        <p className="mt-2 text-sm text-muted">
          <span className="font-medium text-emerald-600">
            {stats.available} available slots
          </span>
          {" · "}
          <span className="font-medium text-sky-600">{stats.booked} booked</span>
          {" · "}
          {stats.sessionDuration}
        </p>
      </div>
      <Button
        variant="primary"
        size="default"
        className="shrink-0"
        onClick={() => setEditorOpen(true)}
      >
        <Calendar className="h-4 w-4" />
        Set Working Hours
      </Button>

      {editorOpen && (
        <WorkingHoursDialog
          weekly={weekly}
          onClose={() => setEditorOpen(false)}
          onDone={refresh}
        />
      )}
    </div>
  );
}

export function AvailabilityLegend() {
  const { availability } = useTeacherAvailability();
  const { stats } = availability;
  const items = [
    { label: "Available", count: stats.available, color: "bg-emerald-400" },
    { label: "Booked", count: stats.booked, color: "bg-sky-500" },
    { label: "Blocked", count: stats.blocked, color: "bg-slate-300" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-4 text-sm">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
          <span className="text-muted">
            {item.label}{" "}
            <span className="font-semibold text-foreground">({item.count})</span>
          </span>
        </div>
      ))}
    </div>
  );
}
