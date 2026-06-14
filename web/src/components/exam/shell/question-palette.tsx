"use client";

import { Check } from "lucide-react";
import { answeredCount, isAnswered } from "@/lib/exam/helpers";
import type { AnswerMap } from "@/lib/exam/types";
import { cn } from "@/lib/utils";

export interface PalettePart {
  id: string;
  label: string;
  numbers: number[];
}

interface QuestionPaletteProps {
  parts: PalettePart[];
  answers: AnswerMap;
  activePart: string;
  current: number | null;
  onSelectPart: (partId: string) => void;
  onSelectQuestion: (n: number) => void;
  onSubmit: () => void;
  submitLabel?: string;
}

export function QuestionPalette({
  parts,
  answers,
  activePart,
  current,
  onSelectPart,
  onSelectQuestion,
  onSubmit,
  submitLabel = "Submit section",
}: QuestionPaletteProps) {
  const active = parts.find((p) => p.id === activePart) ?? parts[0];

  return (
    <footer className="z-20 shrink-0 border-t border-slate-200 bg-white">
      {/* Active part — expanded question numbers */}
      <div className="flex items-center gap-3 overflow-x-auto px-4 py-2.5">
        <span className="shrink-0 text-[13px] font-bold text-navy">
          {active.label}
        </span>
        <div className="flex items-center gap-1.5">
          {active.numbers.map((n) => {
            const done = isAnswered(answers[n]);
            const isCurrent = current === n;
            return (
              <button
                key={n}
                type="button"
                onClick={() => onSelectQuestion(n)}
                className={cn(
                  "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[13px] font-semibold transition",
                  isCurrent
                    ? "bg-navy text-white ring-2 ring-navy ring-offset-1"
                    : done
                      ? "bg-slate-100 text-navy hover:bg-slate-200"
                      : "border border-slate-200 text-slate-500 hover:bg-slate-50",
                )}
              >
                {done && !isCurrent && (
                  <span className="absolute -top-1 left-1/2 h-1 w-5 -translate-x-1/2 rounded-full bg-emerald-500" />
                )}
                {n}
              </button>
            );
          })}
        </div>
      </div>

      {/* Part summary row + submit */}
      <div className="flex items-stretch gap-1 border-t border-slate-100 bg-slate-50/70 px-3 py-2">
        <div className="flex flex-1 items-center gap-1 overflow-x-auto">
          {parts.map((p) => {
            const count = answeredCount(answers, p.numbers);
            const isActive = p.id === activePart;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectPart(p.id)}
                className={cn(
                  "flex shrink-0 flex-col items-start rounded-lg border px-3 py-1.5 text-left transition",
                  isActive
                    ? "border-navy bg-white shadow-sm"
                    : "border-transparent hover:bg-white",
                )}
              >
                <span
                  className={cn(
                    "text-[12px] font-bold",
                    isActive ? "text-navy" : "text-slate-600",
                  )}
                >
                  {p.label}
                </span>
                <span className="text-[11px] text-slate-400">
                  {count} of {p.numbers.length}
                </span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={onSubmit}
          className="flex shrink-0 items-center gap-2 rounded-lg bg-brand-red px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-brand-red-hover"
        >
          <Check size={15} />
          <span className="hidden sm:inline">{submitLabel}</span>
        </button>
      </div>
    </footer>
  );
}
