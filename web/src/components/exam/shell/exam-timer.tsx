"use client";

import { Clock } from "lucide-react";
import { formatLongClock } from "@/lib/exam/helpers";
import { cn } from "@/lib/utils";

interface ExamTimerProps {
  remainingSeconds: number;
  hidden?: boolean;
}

export function ExamTimer({ remainingSeconds, hidden }: ExamTimerProps) {
  const low = remainingSeconds <= 300; // 5 min
  const critical = remainingSeconds <= 60;

  if (hidden) {
    return (
      <div className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-[13px] font-medium text-slate-300">
        <Clock size={15} />
        Timer hidden
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold tabular-nums transition-colors",
        critical
          ? "bg-brand-red text-white"
          : low
            ? "bg-amber-400/90 text-amber-950"
            : "bg-white/10 text-white",
      )}
    >
      <Clock size={15} className={cn(critical && "animate-pulse")} />
      {formatLongClock(remainingSeconds)}
      <span className="hidden text-[11px] font-medium opacity-80 sm:inline">
        left
      </span>
    </div>
  );
}
