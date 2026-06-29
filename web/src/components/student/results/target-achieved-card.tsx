"use client";

import { useRouter } from "next/navigation";
import { Target, Trophy } from "lucide-react";
import { useStudentResultsData } from "@/contexts/student-results-context";
import { formatBandDisplay } from "@/lib/api/mappers/student";

export function TargetAchievedCard() {
  const router = useRouter();
  const { data } = useStudentResultsData();
  if (!data?.released || !data.targetAchieved || data.targetBand == null) return null;

  const nextTarget = data.targetBand + 0.5;

  return (
    <div className="overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100/70 p-5 shadow-sm">
      <div className="flex gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-200 text-amber-700">
          <Trophy className="h-5 w-5" strokeWidth={1.75} />
        </div>
        <div>
          <h3 className="font-bold text-gray-900" style={{ fontSize: "15px" }}>
            Target Achieved!
          </h3>
          <p className="text-amber-700" style={{ fontSize: "12px" }}>
            Band {formatBandDisplay(data.targetBand)} Goal Reached
          </p>
        </div>
      </div>
      <p className="mt-3 text-gray-600" style={{ fontSize: "13px" }}>
        {data.targetMessage}
      </p>
      <button
        type="button"
        onClick={() => router.push("/student/browse")}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1B2A4A] px-4 py-2.5 font-semibold text-white transition-colors hover:bg-[#243660]"
        style={{ fontSize: "13px" }}
      >
        <Target size={15} />
        Book Next Mock (Target {formatBandDisplay(nextTarget)})
      </button>
    </div>
  );
}
