"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function ExamError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Exam route error:", error);
  }, [error]);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-slate-100 p-8 text-center">
      <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <AlertTriangle size={22} />
        </div>
        <h1 className="text-lg font-bold text-navy">
          This section could not be displayed
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          The exam content failed to load correctly. Your answers are saved
          automatically. You can retry, or contact your invigilator if this
          keeps happening.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-xl bg-brand-red px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-red-hover"
          >
            Retry
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Reload page
          </button>
        </div>
      </div>
    </div>
  );
}
