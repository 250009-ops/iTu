"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { useAdminStudents } from "@/contexts/admin-students-context";
import { getErrorMessage } from "@/lib/api/errors";
import type { ActiveAdminGrant, Student } from "@/lib/admin/types";

export function RevokeGrantDialog({
  student,
  grant,
  onClose,
}: {
  student: Student;
  grant: ActiveAdminGrant;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const { revokeGrant } = useAdminStudents();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRevoke() {
    setSubmitting(true);
    setError(null);
    try {
      const result = await revokeGrant(grant.enrollmentId);
      toast("Complimentary mock removed", {
        description: `${grant.packageTitle} · ${result.enrollmentCode}`,
        variant: "success",
      });
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, "Could not remove the mock. Please try again."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open onClose={onClose} ariaLabel={`Remove mock grant for ${student.name}`}>
      <div className="px-6 py-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-700">
            <AlertTriangle size={18} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-navy">Remove complimentary mock?</h2>
            <p className="mt-2 text-sm text-muted">
              This will cancel <span className="font-medium text-foreground">{student.name}</span>
              &apos;s active grant for{" "}
              <span className="font-medium text-foreground">{grant.packageTitle}</span> (
              {grant.enrollmentCode}). The student will be notified and can receive a new
              grant afterward.
            </p>
          </div>
        </div>
        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>
      <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
        <Button variant="secondary" onClick={onClose} disabled={submitting}>
          Keep grant
        </Button>
        <Button
          variant="primary"
          className="bg-rose-600 hover:bg-rose-700"
          onClick={handleRevoke}
          loading={submitting}
        >
          Remove grant
        </Button>
      </div>
    </Modal>
  );
}
