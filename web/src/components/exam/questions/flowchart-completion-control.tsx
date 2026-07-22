"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { CompletionLine, MatchOption } from "@/lib/exam/types";
import { GapInput } from "@/components/exam/questions/gap-input";
import {
  isTextSpan,
  normalizeCompletionLines,
  normalizeFlowchartSteps,
} from "@/lib/exam/inline-content";
import { isGap } from "@/lib/exam/types";
import { matchOptionDisplayLabel } from "@/lib/exam/matching-options";
import { cn } from "@/lib/utils";

type Props = {
  title?: string;
  answerMode?: "option" | "text";
  steps: CompletionLine[];
  options: MatchOption[];
  answers: Record<number, string>;
  current: number | null;
  onAssign: (n: number, value: string | null) => void;
  onFocus: (n: number) => void;
  onPasteBlocked?: () => void;
};

function InlineOptionGap({
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
        "mx-0.5 inline-flex cursor-pointer items-center align-middle",
        active && "rounded-sm bg-sky-50 ring-2 ring-navy/15",
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
        <span className="ml-1.5 text-[14px] font-medium text-emerald-900">
          {word}
        </span>
      ) : (
        <span
          className={cn(
            "ml-1.5 inline-block min-w-[4rem] border-b-2 border-dashed border-slate-300",
            picked && "border-navy bg-sky-50/50",
          )}
          aria-hidden
        />
      )}
    </span>
  );
}

function renderStepInline({
  line,
  answerMode,
  options,
  answers,
  current,
  picked,
  onAssign,
  onFocus,
  onPasteBlocked,
  setPicked,
}: {
  line: CompletionLine;
  answerMode: "option" | "text";
  options: MatchOption[];
  answers: Record<number, string>;
  current: number | null;
  picked: string | null;
  onAssign: (n: number, value: string | null) => void;
  onFocus: (n: number) => void;
  onPasteBlocked?: () => void;
  setPicked: (id: string | null) => void;
}) {
  return line.nodes.map((node, j) => {
    if (isGap(node)) {
      if (answerMode === "text") {
        return (
          <GapInput
            key={`gap-${node.n}`}
            n={node.n}
            value={answers[node.n] ?? ""}
            placeholder={node.placeholder}
            active={current === node.n}
            onChange={(v) => onAssign(node.n, v)}
            onFocus={() => onFocus(node.n)}
            onPasteBlocked={onPasteBlocked}
          />
        );
      }
      return (
        <InlineOptionGap
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
        <span key={`t-${j}`} className={cn(node.bold && "font-bold text-navy")}>
          {node.value}
        </span>
      );
    }
    if (typeof node === "string") {
      return <span key={`t-${j}`}>{node}</span>;
    }
    return null;
  });
}

/** Listening flow-chart: vertical steps with inline text + gaps in each box. */
export function FlowchartCompletionControl({
  title,
  answerMode = "option",
  steps,
  options,
  answers,
  current,
  onAssign,
  onFocus,
  onPasteBlocked,
}: Props) {
  const [picked, setPicked] = useState<string | null>(null);
  const isTextMode = answerMode === "text";
  const normalized = normalizeCompletionLines(steps);

  return (
    <div className="space-y-4">
      {!isTextMode && (
        <div className="flex flex-wrap gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3">
          <p className="w-full text-[12px] font-semibold uppercase tracking-wide text-slate-500">
            Options
          </p>
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
                  "cursor-grab rounded-lg border px-3 py-1.5 text-[13px] font-medium transition active:cursor-grabbing",
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
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        {title && (
          <h4 className="mb-4 text-center text-[15px] font-bold text-navy">{title}</h4>
        )}
        <div className="flex flex-col items-center gap-1">
          {normalized.map((line, i) => (
            <div key={i} className="flex w-full flex-col items-center">
              <div className="flex w-full max-w-lg flex-wrap items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-center text-[14px] font-medium text-slate-800">
                {renderStepInline({
                  line,
                  answerMode: isTextMode ? "text" : "option",
                  options,
                  answers,
                  current,
                  picked,
                  onAssign,
                  onFocus,
                  onPasteBlocked,
                  setPicked,
                })}
              </div>
              {i < normalized.length - 1 && (
                <ChevronDown
                  className="my-0.5 h-5 w-5 shrink-0 text-slate-400"
                  aria-hidden
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Resolve steps from group payload (supports legacy `nodes`). */
export function flowchartStepsFromGroup(group: {
  steps?: CompletionLine[];
  nodes?: { kind: "text" | "gap"; text?: string; n?: number }[];
}): CompletionLine[] {
  return normalizeFlowchartSteps(group);
}
