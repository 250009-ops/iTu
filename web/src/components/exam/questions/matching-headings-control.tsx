"use client";

import type { MatchOption, MatchingGroup } from "@/lib/exam/types";
import { usedHeadingIds } from "@/lib/exam/matching-headings";
import { useReadingHeadings } from "@/components/exam/reading/reading-headings-context";
import { cn } from "@/lib/utils";

type Props = {
  group: Pick<MatchingGroup, "options" | "questions" | "example">;
  answers: Record<number, string>;
  current: number | null;
  onFocus: (n: number) => void;
};

/** Right pane: heading bank for matching headings (drop targets live on the passage). */
export function MatchingHeadingsControl({
  group,
  answers,
  current,
  onFocus,
}: Props) {
  const { options, questions } = group;
  const ctx = useReadingHeadings();
  const picked = ctx?.pickedHeadingId ?? null;
  const setPicked = ctx?.setPickedHeadingId ?? (() => {});
  const used = usedHeadingIds(group, answers);

  return (
    <div className="space-y-4">
      {group.example && (
        <p className="rounded-lg border border-amber-200 bg-amber-50/90 px-3 py-2 text-[13px] text-amber-950">
          Section {group.example.section} is shown as an example in the passage (pre-filled).
          Answer questions {questions[0]?.n}
          {questions.length > 1 ? `–${questions[questions.length - 1]!.n}` : ""} below.
        </p>
      )}
      <p className="rounded-lg border border-sky-200 bg-sky-50/80 px-3 py-2 text-[13px] text-sky-900">
        Drag a heading onto the drop zone above each section in the passage (left
        pane), or click a heading then click a drop zone.
      </p>

      <div className="space-y-2">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">
          List of headings
        </p>
        <ul className="space-y-1.5 rounded-xl border border-slate-200 bg-white p-2">
          {options.map((opt) => {
            const isPicked = picked === opt.id;
            const isUsed = used.has(opt.id);
            return (
              <li key={opt.id}>
                <button
                  type="button"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", opt.id);
                    e.dataTransfer.effectAllowed = "copy";
                    setPicked(opt.id);
                  }}
                  onClick={() => setPicked(isPicked ? null : opt.id)}
                  className={cn(
                    "flex w-full cursor-grab items-start gap-2 rounded-lg border px-3 py-2 text-left text-[14px] transition active:cursor-grabbing",
                    isPicked
                      ? "border-navy bg-navy text-white shadow-md"
                      : isUsed
                        ? "border-slate-200 bg-slate-50 text-slate-400"
                        : "border-slate-200 bg-white text-slate-800 hover:border-navy hover:bg-sky-50",
                  )}
                >
                  <span className="font-semibold">{opt.id}.</span>
                  <span className="flex-1">
                    {opt.label.replace(/^[ivx]+\.\s*/i, "")}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="space-y-1.5">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">
          Questions
        </p>
        <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
          {questions.map((q) => {
            const assigned = options.find((o) => o.id === answers[q.n]);
            const isActive = current === q.n;
            return (
              <li key={q.n} id={`q-${q.n}`} className="scroll-mt-20">
                <button
                  type="button"
                  onClick={() => onFocus(q.n)}
                  className={cn(
                    "flex w-full items-center gap-3 px-3 py-2.5 text-left transition",
                    isActive && "bg-sky-50",
                  )}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-navy text-[12px] font-bold text-white">
                    {q.n}
                  </span>
                  <span className="min-w-0 flex-1 text-[13px] text-slate-700">
                    {q.section ? `Section ${q.section}` : q.prompt}
                  </span>
                  <span
                    className={cn(
                      "max-w-[45%] truncate text-[12px]",
                      assigned ? "font-medium text-emerald-700" : "text-slate-400",
                    )}
                  >
                    {assigned ? assigned.label : "Not assigned"}
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
