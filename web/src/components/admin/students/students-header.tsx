"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useAdminStudents } from "@/contexts/admin-students-context";
import { exportStudentsCsv } from "@/lib/admin/export";

export function StudentsHeader() {
  const { toast } = useToast();
  const { students } = useAdminStudents();

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-xs font-medium text-muted">Admin &gt; Students</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-navy sm:text-3xl">
          Students
        </h1>
        <p className="mt-1 text-sm text-muted">
          Review registered students and grant complimentary mock exams.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            exportStudentsCsv(students);
            toast("Export ready", {
              description: `${students.length} students downloaded.`,
            });
          }}
        >
          <Download className="h-4 w-4" />
          Export
        </Button>
      </div>
    </div>
  );
}
