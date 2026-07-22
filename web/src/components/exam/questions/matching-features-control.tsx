"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { QuestionNumberBadge } from "@/components/exam/ui/question-number-badge";
import type { MatchOption } from "@/lib/exam/types";
import {
  matchOptionDisplayLabel,
  usedMatchOptionIds,
} from "@/lib/exam/matching-options";
import { cn } from "@/lib/utils";

type Props = {
  listTitle?: string;
  options: MatchOption[];
  questions: { n: number; prompt: string }[];
  answers: Record<number, string>;
  current: number | null;
  reuseOptions?: boolean;
  onAssign: (n: number, optionId: string | null) => void;
  onFocus: (n: number) => void;
};

/** Cambridge-style matching features: statements + drop zones, people/options bank on the right. */
export function MatchingFeaturesControl({
  listTitle,
  options,
  questions,
  answers,
  current,
  reuseOptions = true,
  onAssign,
  onFocus,
}: Props) {
  const [picked, setPicked] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  function assign(n: number, id: string | null) {
    if (!reuseOptions && id) {
      for (const q of questions) {
        if (q.n !== n && answers[q.n] === id) {
          onAssign(q.n, null);
        }
      }
    }
    onAssign(n, id);
  }

  const handleSlotActivate = (n: number) => {
    onFocus(n);
    if (picked) {
      assign(n, picked);
      setPicked(null);
    }
  };

  const usedElsewhere = (forQuestion: number | null) =>
    reuseOptions
      ? new Set<string>()
      : usedMatchOptionIds(questions, answers, forQuestion ?? undefined);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_11rem]">
      <ol className="space-y-2">
        {questions.map((q) => {
          const assignedId = answers[q.n];
          const assigned = options.find((o) => o.id === assignedId);
          const isActive = current === q.n;
          return (
            <li
              key={q.n}
              id={`q-${q.n}`}
              className={cn(
                "scroll-mt-20 flex items-center gap-3 rounded-xl border px-3 py-2.5 transition",
                isActive ? "border-navy bg-sky-50" : "border-slate-200 bg-white",
              )}
            >
              <QuestionNumberBadge n={q.n} active={isActive} />
              <span className="min-w-0 flex-1 text-[14px] leading-snug text-slate-800">
                {q.prompt}
              </span>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(q.n);
                }}
                onDragLeave={() => setDragOver(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData("text/plain");
                  if (id) assign(q.n, id);
                  setDragOver(null);
                  setPicked(null);
                }}
                onClick={() => handleSlotActivate(q.n)}
                className={cn(
                  "flex h-9 w-[7.5rem] shrink-0 cursor-pointer items-center justify-between gap-1 rounded-lg border-2 border-dashed px-2 transition",
                  dragOver === q.n
                    ? "border-navy bg-sky-100"
                    : assigned
                      ? "border-emerald-300 bg-emerald-50"
                      : "border-slate-300 bg-slate-50 hover:border-navy",
                )}
              >
                {assigned ? (
                  <>
                    <span className="truncate text-[13px] font-bold text-emerald-800">
                      {assigned.id}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        assign(q.n, null);
                      }}
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-emerald-600 hover:bg-emerald-100"
                      aria-label={`Clear answer for question ${q.n}`}
                    >
                      <X size={13} />
                    </button>
                  </>
                ) : (
                  <span className="w-full text-center text-[12px] text-slate-400">
                    {picked ? "Click" : "Drop here"}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 lg:sticky lg:top-4 lg:self-start">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
          {listTitle ?? "List of options"}
        </p>
        <ul className="space-y-1.5">
          {options.map((opt) => {
            const isPicked = picked === opt.id;
            const isUsed = usedElsewhere(current).has(opt.id);
            return (
              <li key={opt.id}>
                <button
                  type="button"
                  draggable={!isUsed || isPicked}
                  onDragStart={(e) => {
                    if (isUsed && !isPicked) return;
                    e.dataTransfer.setData("text/plain", opt.id);
                    e.dataTransfer.effectAllowed = "copy";
                  }}
                  onClick={() => {
                    if (isUsed && !isPicked) return;
                    setPicked(isPicked ? null : opt.id);
                  }}
                  className={cn(
                    "flex w-full items-start gap-2 rounded-lg border px-2 py-1.5 text-left text-[13px] transition",
                    isUsed && !isPicked
                      ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400"
                      : isPicked
                        ? "cursor-grab border-navy bg-navy text-white shadow-md active:cursor-grabbing"
                        : "cursor-grab border-slate-200 bg-white text-slate-800 hover:border-navy hover:bg-sky-50 active:cursor-grabbing",
                  )}
                >
                  <span className="font-bold">{opt.id}</span>
                  <span className="min-w-0 flex-1 leading-snug">
                    {matchOptionDisplayLabel(opt)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
