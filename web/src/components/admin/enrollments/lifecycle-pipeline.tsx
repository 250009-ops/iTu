"use client";

import { ArrowRight } from "lucide-react";
import { useAdminEnrollments } from "@/contexts/admin-enrollments-context";
import { cn } from "@/lib/utils";

const toneStyles = {
  navy: "bg-navy text-white",
  sky: "bg-sky-500 text-white",
  amber: "bg-amber-500 text-white",
  emerald: "bg-emerald-500 text-white",
  rose: "bg-rose-500 text-white",
};

export function LifecyclePipeline() {
  const { lifecyclePipeline } = useAdminEnrollments();

  return (
    <div className="rounded-xl border border-border bg-white p-5 shadow-sm sm:p-6">
      <div>
        <h2 className="font-semibold text-navy">Exam Lifecycle Pipeline</h2>
        <p className="mt-0.5 text-sm text-muted">
          How enrollments flow through the assessment process
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-stretch">
        {lifecyclePipeline.map((stage, index) => (
          <div key={stage.stage} className="flex flex-1 items-center gap-3">
            <div
              className={cn(
                "flex flex-1 flex-col rounded-xl px-4 py-4",
                toneStyles[stage.tone],
              )}
            >
              <p className="text-sm font-semibold opacity-90">{stage.stage}</p>
              <p className="mt-1 text-2xl font-bold">{stage.count}</p>
              <p className="text-xs opacity-80">
                {stage.sublabel} · {stage.pct}%
              </p>
            </div>
            {index < lifecyclePipeline.length - 1 && (
              <ArrowRight className="hidden h-5 w-5 shrink-0 text-slate-300 lg:block" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
