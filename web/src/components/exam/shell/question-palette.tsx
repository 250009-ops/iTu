"use client";

import { Check, ChevronLeft, ChevronRight } from "lucide-react";
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
  const activeIndex = Math.max(
    0,
    parts.findIndex((p) => p.id === activePart),
  );
  const active = parts[activeIndex] ?? parts[0];
  if (!active) return null;

  const canGoPrev = activeIndex > 0;
  const canGoNext = activeIndex < parts.length - 1;

  function goPrevPart() {
    if (!canGoPrev) return;
    onSelectPart(parts[activeIndex - 1]!.id);
  }

  function goNextPart() {
    if (!canGoNext) return;
    onSelectPart(parts[activeIndex + 1]!.id);
  }

  return (
    <footer className="z-20 shrink-0 border-t border-slate-200 bg-white">
      {/* Question numbers for the active part */}
      <div className="flex items-center gap-3 overflow-x-auto border-b border-slate-100 px-4 py-2">
        <span className="shrink-0 text-[13px] font-bold text-navy">{active.label}</span>
        <div className="flex items-center gap-1">
          {active.numbers.map((n) => {
            const done = isAnswered(answers[n]);
            const isCurrent = current === n;
            return (
              <button
                key={n}
                type="button"
                onClick={() => onSelectQuestion(n)}
                className={cn(
                  "relative flex h-7 w-7 shrink-0 items-center justify-center rounded text-[12px] font-semibold transition",
                  isCurrent
                    ? "bg-navy text-white"
                    : done
                      ? "bg-slate-100 text-navy hover:bg-slate-200"
                      : "border border-slate-200 text-slate-500 hover:bg-slate-50",
                )}
              >
                {done && !isCurrent && (
                  <span className="absolute -top-0.5 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-emerald-500" />
                )}
                {n}
              </button>
            );
          })}
        </div>
      </div>

      {/* Part navigation arrows — IDP-style, right-aligned above the part bar */}
      <div className="flex justify-end border-b border-slate-100 bg-white px-3 py-1.5">
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={goPrevPart}
            disabled={!canGoPrev}
            aria-label="Previous part"
            className={cn(
              "flex h-9 w-9 items-center justify-center transition",
              canGoPrev
                ? "bg-slate-500 text-white hover:bg-slate-600"
                : "cursor-not-allowed bg-slate-200 text-slate-400",
            )}
          >
            <ChevronLeft size={18} strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={goNextPart}
            disabled={!canGoNext}
            aria-label="Next part"
            className={cn(
              "flex h-9 w-9 items-center justify-center transition",
              canGoNext
                ? "bg-navy text-white hover:bg-navy/90"
                : "cursor-not-allowed bg-slate-200 text-slate-400",
            )}
          >
            <ChevronRight size={18} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* IDP-style part bar — equal columns separated by vertical dividers */}
      <div className="flex items-stretch bg-slate-50">
        <div className="flex min-w-0 flex-1">
          {parts.map((p) => {
            const count = answeredCount(answers, p.numbers);
            const isActive = p.id === activePart;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectPart(p.id)}
                className={cn(
                  "flex min-w-0 flex-1 items-center justify-center gap-2 border-r border-slate-200 px-3 py-3 text-center transition",
                  isActive ? "bg-white" : "hover:bg-white/70",
                )}
              >
                <span
                  className={cn(
                    "truncate text-[13px]",
                    isActive ? "font-bold text-navy" : "font-semibold text-slate-600",
                  )}
                >
                  {p.label}
                </span>
                <span className="shrink-0 text-[12px] text-slate-500">
                  {count} of {p.numbers.length}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onSubmit}
          title={submitLabel}
          aria-label={submitLabel}
          className="flex w-14 shrink-0 flex-col items-center justify-center gap-0.5 border-l border-slate-200 bg-brand-red text-white transition hover:bg-brand-red-hover"
        >
          <Check size={18} strokeWidth={2.5} />
          <span className="hidden text-[10px] font-semibold leading-none sm:inline">
            End
          </span>
        </button>
      </div>
    </footer>
  );
}
