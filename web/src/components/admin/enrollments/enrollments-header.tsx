"use client";

import { Download, Plus, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function EnrollmentsHeader() {
  const { toast } = useToast();
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-xs font-medium text-muted">Admin &gt; Enrollments</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-navy sm:text-3xl">
          Enrollments
        </h1>
        <p className="mt-1 text-sm text-muted">
          Exam lifecycle management — module progress, examiner assignments,
          scheduling.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() =>
            toast("Filters", {
              description: "Use the lifecycle filter and search in the table below.",
              variant: "info",
            })
          }
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filter
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() =>
            toast("Export started", {
              description: "Your enrollments export will download shortly.",
            })
          }
        >
          <Download className="h-4 w-4" />
          Export
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={() =>
            toast("New enrollment", {
              description: "Manually create an enrollment for a student soon.",
              variant: "info",
            })
          }
        >
          <Plus className="h-4 w-4" />
          New Enrollment
        </Button>
      </div>
    </div>
  );
}
