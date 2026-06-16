"use client";

import { Download, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useAdminTeachers } from "@/contexts/admin-teachers-context";
import { exportTeachersCsv } from "@/lib/admin/export";

export function TeachersHeader() {
  const { toast } = useToast();
  const { examiners } = useAdminTeachers();

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-xs font-medium text-muted">Admin &gt; Teachers</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-navy sm:text-3xl">
          Teachers Management
        </h1>
        <p className="mt-1 text-sm text-muted">
          Manage examiner onboarding, performance, and compliance.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            exportTeachersCsv(examiners);
            toast("Export ready", {
              description: `${examiners.length} teachers downloaded.`,
            });
          }}
        >
          <Download className="h-4 w-4" />
          Export
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={() =>
            toast("Invite teacher", {
              description: "Send an examiner onboarding invite by email soon.",
              variant: "info",
            })
          }
        >
          <UserPlus className="h-4 w-4" />
          Invite Teacher
        </Button>
      </div>
    </div>
  );
}
