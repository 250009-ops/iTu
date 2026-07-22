"use client";

import { useState } from "react";
import type { CompletionLine, MatchOption } from "@/lib/exam/types";
import {
  completionLineClass,
  isTextSpan,
  normalizeCompletionLines,
} from "@/lib/exam/inline-content";
import { isGap } from "@/lib/exam/types";
import { matchOptionDisplayLabel } from "@/lib/exam/matching-options";
import { cn } from "@/lib/utils";

type Props = {
  title?: string;
  lines: CompletionLine[];
  options: MatchOption[];
  answers: Record<number, string>;
  current: number | null;
  onAssign: (n: number, optionId: string | null) => void;
  onFocus: (n: number) => void;
};

function InlineListGap({
  n,
  optionId,
  options,
  active,
  picked,
  onAssign,
  onFocus,
  setPicked,
}: {
  n: number;
  optionId?: string;
  options: MatchOption[];
  active: boolean;
  picked: string | null;
  onAssign: (n: number, id: string | null) => void;
  onFocus: (n: number) => void;
  setPicked: (id: string | null) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const assigned = options.find((o) => o.id === optionId);
  const word = assigned ? matchOptionDisplayLabel(assigned) : "";

  return (
    <span
      id={`q-${n}`}
      className={cn(
        "mx-0.5 inline-flex cursor-pointer items-baseline align-baseline rounded-sm transition",
        active && "bg-sky-50 ring-2 ring-navy/15",
        dragOver && "bg-sky-100",
      )}
      onClick={() => {
        onFocus(n);
        if (picked) {
          onAssign(n, picked);
          setPicked(null);
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        const id = e.dataTransfer.getData("text/plain");
        if (id) onAssign(n, id);
        setDragOver(false);
        setPicked(null);
      }}
    >
      <span
        className={cn(
          "inline-flex h-6 min-w-[1.65rem] items-center justify-center rounded border px-1 text-[11px] font-bold",
          word
            ? "border-emerald-300 bg-emerald-50 text-emerald-800"
            : "border-slate-300 bg-slate-100 text-slate-600",
        )}
      >
        {n}
      </span>
      {word ? (
        <span className="mx-1 border-b-2 border-emerald-400 text-[15px] font-medium text-navy">
          {word}
        </span>
      ) : (
        <span
          className={cn(
            "mx-1 inline-block min-w-[3.5rem] border-b-2 border-slate-300",
            picked && "border-navy bg-sky-50/50",
          )}
          aria-hidden
        />
      )}
    </span>
  );
}

/** Cambridge-style summary with inline numbered gaps and a lettered word bank below. */
export function SummaryCompletionListControl({
  title,
  lines,
  options,
  answers,
  current,
  onAssign,
  onFocus,
}: Props) {
  const [picked, setPicked] = useState<string | null>(null);
  const normalized = normalizeCompletionLines(lines);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        {title ? (
          <h4 className="mb-4 text-center text-[15px] font-bold text-navy">{title}</h4>
        ) : null}
        <div className="space-y-2 text-[15px] leading-relaxed text-slate-800">
          {normalized.map((line, i) => (
            <p key={i} className={completionLineClass(line.style)}>
              {line.nodes.map((node, j) => {
                if (isGap(node)) {
                  return (
                    <InlineListGap
                      key={`gap-${node.n}`}
                      n={node.n}
                      optionId={answers[node.n]}
                      options={options}
                      active={current === node.n}
                      picked={picked}
                      onAssign={onAssign}
                      onFocus={onFocus}
                      setPicked={setPicked}
                    />
                  );
                }
                if (isTextSpan(node)) {
                  return (
                    <span
                      key={`t-${j}`}
                      className={cn(node.bold && "font-bold text-navy")}
                    >
                      {node.value}
                    </span>
                  );
                }
                if (typeof node === "string") {
                  const trimmed = node.trim();
                  if (!trimmed) return null;
                  return <span key={`t-${j}`}>{node}</span>;
                }
                return null;
              })}
            </p>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
          {options.map((opt) => {
            const isPicked = picked === opt.id;
            const word = matchOptionDisplayLabel(opt);
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
                  "cursor-grab rounded-lg border px-3 py-2 text-left text-[13px] transition active:cursor-grabbing",
                  isPicked
                    ? "border-navy bg-navy text-white shadow-md"
                    : "border-slate-200 bg-white text-slate-700 hover:border-navy hover:bg-sky-50",
                )}
              >
                <span className="font-bold">{opt.id}</span>
                {word ? <span className="ml-1.5">{word}</span> : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
