"use client";

import { AlertTriangle } from "lucide-react";
import type { IntegrityWarning } from "@/hooks/use-exam-integrity";
import { requestExamFullscreen } from "@/hooks/use-exam-integrity";

type Props = {
  warning: IntegrityWarning | null;
  onDismiss: () => void;
};

export function ExamIntegrityWarning({ warning, onDismiss }: Props) {
  if (!warning) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 p-4">
      <div
        className="max-w-md rounded-2xl bg-white p-6 shadow-2xl"
        role="alertdialog"
        aria-labelledby="integrity-warning-title"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h2
              id="integrity-warning-title"
              className="text-lg font-bold text-navy"
            >
              Exam integrity warning
            </h2>
            <p className="mt-2 text-sm text-slate-600">{warning.message}</p>
            {warning.offenseCount > 0 && (
              <p className="mt-2 text-sm font-medium text-amber-800">
                Recorded incidents: {warning.offenseCount}
              </p>
            )}
            {warning.flagged && (
              <p className="mt-2 text-sm font-semibold text-rose-700">
                Your session has been flagged for review. An administrator may end
                this section so you can continue with the remaining parts of your
                mock.
              </p>
            )}
          </div>
        </div>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => {
              requestExamFullscreen();
              onDismiss();
            }}
            className="rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy/90"
          >
            Return to exam
          </button>
        </div>
      </div>
    </div>
  );
}
