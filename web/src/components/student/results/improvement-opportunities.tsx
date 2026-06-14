"use client";

import { Trophy } from "lucide-react";
import { useStudentResultsData } from "@/contexts/student-results-context";
import type { ImprovementOpportunity, PartTone } from "@/lib/api/mappers/student";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

const toneStyles: Record<PartTone, { badge: string; circle: string }> = {
  rose: { badge: "bg-rose-50 text-rose-700", circle: "bg-rose-100 text-rose-700" },
  amber: { badge: "bg-amber-50 text-amber-700", circle: "bg-amber-100 text-amber-700" },
  sky: { badge: "bg-sky-50 text-sky-700", circle: "bg-sky-100 text-sky-700" },
  emerald: { badge: "bg-emerald-50 text-emerald-700", circle: "bg-emerald-100 text-emerald-700" },
};

export function ImprovementOpportunities() {
  const { toast } = useToast();
  const { data } = useStudentResultsData();
  if (!data?.released || !data.improvementOpportunities.length) return null;

  function openOpportunity(item: ImprovementOpportunity) {
    toast(item.title, {
      description: `${item.detail} · ${item.priority} priority`,
      variant: "info",
    });
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Trophy className="h-4 w-4 text-amber-500" />
        <h3 className="font-bold text-gray-900" style={{ fontSize: "15px" }}>
          Improvement Opportunities
        </h3>
      </div>

      <div className="mt-4 space-y-2.5">
        {data.improvementOpportunities.map((item) => {
          const tone = toneStyles[item.tone];
          return (
            <button
              key={item.rank}
              type="button"
              onClick={() => openOpportunity(item)}
              className="flex w-full items-center gap-3 rounded-xl border border-gray-100 p-3 text-left transition-colors hover:border-gray-200 hover:bg-gray-50/60"
            >
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  tone.circle,
                )}
              >
                {item.rank}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-gray-900" style={{ fontSize: "13px" }}>
                  {item.title}
                </p>
                <p className="text-gray-400" style={{ fontSize: "12px" }}>
                  {item.detail}
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold",
                  tone.badge,
                )}
              >
                {item.priority}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
