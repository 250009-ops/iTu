"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { MatchOption } from "@/lib/exam/types";
import { cn } from "@/lib/utils";

interface MatchingControlProps {
  options: MatchOption[];
  questions: { n: number; prompt: string }[];
  answers: Record<number, string>;
  current: number | null;
  onAssign: (n: number, optionId: string | null) => void;
  onFocus: (n: number) => void;
}

/**
 * Drag option chips onto a question's drop slot, or use click-to-assign:
 * click a chip to pick it up, then click a slot. Fully keyboard/touch friendly.
 */
export function MatchingControl({
  options,
  questions,
  answers,
  current,
  onAssign,
  onFocus,
}: MatchingControlProps) {
  const [picked, setPicked] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const handleSlotActivate = (n: number) => {
    onFocus(n);
    if (picked) {
      onAssign(n, picked);
      setPicked(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3">
        {options.map((opt) => {
          const isPicked = picked === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", opt.id);
                e.dataTransfer.effectAllowed = "copy";
              }}
              onClick={() => setPicked(isPicked ? null : opt.id)}
              className={cn(
                "cursor-grab rounded-lg border px-3 py-1.5 text-[13px] font-medium transition active:cursor-grabbing",
                isPicked
                  ? "border-navy bg-navy text-white shadow-md"
                  : "border-slate-200 bg-white text-slate-700 hover:border-navy hover:bg-sky-50",
              )}
            >
              <span className="font-bold">{opt.id}</span>
              {opt.label.replace(/^[A-Z]\.?\s*/i, "").trim() && (
                <span className="ml-1.5 font-normal">
                  {opt.label.replace(/^[A-Z]\.?\s*/i, "")}
                </span>
              )}
            </button>
          );
        })}
      </div>

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
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-navy text-[13px] font-bold text-white">
                {q.n}
              </span>
              <span className="flex-1 text-[14px] text-slate-700">
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
                  if (id) onAssign(q.n, id);
                  setDragOver(null);
                }}
                onClick={() => handleSlotActivate(q.n)}
                className={cn(
                  "flex h-9 min-w-[8rem] cursor-pointer items-center justify-between gap-2 rounded-lg border-2 border-dashed px-2.5 transition",
                  dragOver === q.n
                    ? "border-navy bg-sky-100"
                    : assigned
                      ? "border-emerald-300 bg-emerald-50"
                      : "border-slate-300 bg-slate-50 hover:border-navy",
                )}
              >
                {assigned ? (
                  <>
                    <span className="truncate text-[13px] font-semibold text-emerald-800">
                      {assigned.id}
                      {assigned.label.replace(/^[A-Z]\.?\s*/i, "").trim() &&
                        ` — ${assigned.label.replace(/^[A-Z]\.?\s*/i, "")}`}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAssign(q.n, null);
                      }}
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-emerald-600 hover:bg-emerald-100"
                    >
                      <X size={13} />
                    </button>
                  </>
                ) : (
                  <span className="text-[12px] text-slate-400">
                    {picked ? "Click to place" : "Drop here"}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
