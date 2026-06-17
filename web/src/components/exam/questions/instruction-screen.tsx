"use client";

import { ChevronRight } from "lucide-react";
import type { InstructionScreenGroup } from "@/lib/exam/types";
import { cn } from "@/lib/utils";

type Props = {
  group: InstructionScreenGroup;
  onContinue: () => void;
  /** When true, covers the exam canvas (reading interstitial). */
  overlay?: boolean;
  className?: string;
};

export function InstructionScreen({
  group,
  onContinue,
  overlay,
  className,
}: Props) {
  return (
    <div
      className={cn(
        overlay &&
          "fixed inset-x-0 bottom-[7.5rem] top-[7.5rem] z-30 flex items-center justify-center bg-white/98 px-6 backdrop-blur-sm",
        className,
      )}
    >
      <div
        className={cn(
          "mx-auto w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 shadow-lg",
          !overlay && "my-6",
        )}
      >
        <p className="mb-2 text-[12px] font-bold uppercase tracking-wider text-brand-red">
          Instructions
        </p>
        <div className="mb-6 space-y-3 text-[15px] leading-relaxed text-slate-800">
          {(group.body || group.instruction)
            .split(/\n+/)
            .filter(Boolean)
            .map((line, i) => (
              <p key={i}>{line}</p>
            ))}
        </div>
        {group.hint && (
          <p className="mb-6 text-[13px] font-medium text-slate-500">{group.hint}</p>
        )}
        <button
          type="button"
          onClick={onContinue}
          className="inline-flex items-center gap-2 rounded-lg bg-navy px-6 py-2.5 text-[14px] font-semibold text-white transition hover:bg-navy/90"
        >
          {group.buttonLabel ?? "Next"}
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
