"use client";

import { useState } from "react";
import { CalendarDays, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { reappointEnrollment } from "@/lib/api/admin";
import { getErrorMessage } from "@/lib/api/errors";
import { localTodayIso } from "@/lib/student/datetime";

export function ReappointMockDialog({
  enrollmentId,
  enrollmentCode,
  studentName,
  complimentaryAccess,
  onClose,
  onDone,
}: {
  enrollmentId: string;
  enrollmentCode: string;
  studentName: string;
  /** Zero-charge grant (admin / welcome / referral / centre) — not a paid purchase. */
  complimentaryAccess: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [mockDate, setMockDate] = useState(localTodayIso());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);
    try {
      const result = await reappointEnrollment({
        enrollmentId,
        mockDate,
      });
      toast("Mock reappointed", {
        description: `${studentName} · ${result.enrollmentCode}`,
        variant: "success",
      });
      onDone();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, "Could not reappoint the mock"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open onClose={onClose} ariaLabel={`Reappoint mock ${enrollmentCode}`}>
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-700">
            <RefreshCw size={18} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-navy">Reappoint missed mock</h2>
            <p className="text-sm text-muted">
              {studentName} · {enrollmentCode}
              {complimentaryAccess ? " · complimentary / bonus" : " · paid"}
            </p>
          </div>
        </div>
      </div>
      <div className="px-6 py-5">
        <label className="text-sm font-semibold text-navy">New mock day</label>
        <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-border px-3">
          <CalendarDays className="h-4 w-4 text-slate-400" />
          <input
            type="date"
            value={mockDate}
            min={localTodayIso()}
            onChange={(e) => setMockDate(e.target.value)}
            className="h-11 flex-1 bg-transparent text-sm focus:outline-none"
          />
        </div>
        <p className="mt-3 text-xs text-muted">
          Creates a new enrollment at no charge. The missed record ({enrollmentCode})
          is kept for audit. After reappointing the day, the student may need to pick
          or rebook a speaking slot — flexible reappoint clears any fixed speaking time.
        </p>
        {error && (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
      </div>
      <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
        <Button variant="secondary" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button variant="primary" loading={submitting} onClick={handleConfirm}>
          Reappoint mock
        </Button>
      </div>
    </Modal>
  );
}
