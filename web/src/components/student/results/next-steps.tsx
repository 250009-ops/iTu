"use client";

import { useState } from "react";
import { Check, ListChecks } from "lucide-react";
import { useStudentResultsData } from "@/contexts/student-results-context";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export function NextSteps() {
  const { toast } = useToast();
  const { data } = useStudentResultsData();
  const [done, setDone] = useState<boolean[]>([]);

  if ((!data?.released && !data?.partial) || !data.nextSteps.length) {
    return null;
  }

  const steps = data.nextSteps;

  function toggle(index: number) {
    setDone((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      if (next[index] && next.length === steps.length && next.every(Boolean)) {
        toast("Study plan complete", {
          description: "Nice work — you've actioned every next step.",
          variant: "success",
        });
      }
      return next;
    });
  }

  const completed = steps.filter((_, i) => done[i]).length;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-gray-400" />
          <h3 className="font-bold text-gray-900" style={{ fontSize: "15px" }}>
            Next Steps
          </h3>
        </div>
        <span className="text-xs font-semibold text-gray-400">
          {completed}/{steps.length}
        </span>
      </div>

      <div className="mt-3 space-y-1">
        {steps.map((step, index) => {
          const checked = done[index] ?? false;
          return (
            <button
              key={step}
              type="button"
              onClick={() => toggle(index)}
              className="flex w-full items-center gap-3 rounded-lg px-1.5 py-2 text-left transition-colors hover:bg-gray-50"
            >
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                  checked
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-gray-300 bg-white",
                )}
              >
                {checked && <Check size={13} strokeWidth={3} />}
              </span>
              <span
                className={cn(
                  "transition-colors",
                  checked ? "text-gray-400 line-through" : "text-gray-600",
                )}
                style={{ fontSize: "13px" }}
              >
                {step}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
