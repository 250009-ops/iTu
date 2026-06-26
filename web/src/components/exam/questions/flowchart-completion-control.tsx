"use client";

import { useState } from "react";
import { ChevronDown, X } from "lucide-react";
import type { FlowchartNode, MatchOption } from "@/lib/exam/types";
import { QuestionNumberBadge } from "@/components/exam/ui/question-number-badge";
import { cn } from "@/lib/utils";

type Props = {
  title?: string;
  answerMode?: "option" | "text";
  nodes: FlowchartNode[];
  options: MatchOption[];
  answers: Record<number, string>;
  current: number | null;
  onAssign: (n: number, value: string | null) => void;
  onFocus: (n: number) => void;
  onPasteBlocked?: () => void;
};

function OptionGapNode({
  n,
  assigned,
  options,
  isActive,
  picked,
  onAssign,
  onFocus,
  setPicked,
}: {
  n: number;
  assigned?: MatchOption;
  options: MatchOption[];
  isActive: boolean;
  picked: string | null;
  onAssign: (n: number, id: string | null) => void;
  onFocus: (n: number) => void;
  setPicked: (id: string | null) => void;
}) {
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      id={`q-${n}`}
      className="scroll-mt-20 flex w-full max-w-md flex-col items-center"
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
      onClick={() => {
        onFocus(n);
        if (picked) {
          onAssign(n, picked);
          setPicked(null);
        }
      }}
    >
      <div
        className={cn(
          "flex min-h-[2.75rem] w-full cursor-pointer items-center justify-between gap-2 rounded-lg border-2 px-3 py-2 transition",
          dragOver || isActive
            ? "border-navy bg-sky-50"
            : assigned
              ? "border-emerald-400 bg-emerald-50"
              : "border-dashed border-slate-300 bg-white hover:border-navy",
        )}
      >
        <div className="flex items-center gap-2">
          <QuestionNumberBadge n={n} active={isActive} />
          {assigned ? (
            <span className="text-[14px] font-medium text-emerald-900">
              {assigned.label}
            </span>
          ) : (
            <span className="text-[13px] text-slate-400">
              {picked ? "Click to place" : "Drop answer here"}
            </span>
          )}
        </div>
        {assigned && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAssign(n, null);
            }}
            className="flex h-6 w-6 items-center justify-center rounded text-emerald-700 hover:bg-emerald-100"
            aria-label={`Clear answer for question ${n}`}
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

function TextGapNode({
  n,
  value,
  isActive,
  onAssign,
  onFocus,
  onPasteBlocked,
}: {
  n: number;
  value: string;
  isActive: boolean;
  onAssign: (n: number, value: string) => void;
  onFocus: (n: number) => void;
  onPasteBlocked?: () => void;
}) {
  return (
    <div
      id={`q-${n}`}
      className="scroll-mt-20 flex w-full max-w-md flex-col items-center"
    >
      <div
        className={cn(
          "flex min-h-[2.75rem] w-full items-center gap-2 rounded-lg border-2 px-3 py-2 transition",
          isActive
            ? "border-navy bg-sky-50"
            : value.trim()
              ? "border-emerald-400 bg-emerald-50"
              : "border-slate-200 bg-white",
        )}
      >
        <QuestionNumberBadge n={n} active={isActive} />
        <input
          type="text"
          value={value}
          onFocus={() => onFocus(n)}
          onChange={(e) => onAssign(n, e.target.value)}
          onPaste={(e) => {
            e.preventDefault();
            onPasteBlocked?.();
          }}
          spellCheck={false}
          autoComplete="off"
          placeholder="Your answer"
          className={cn(
            "min-w-0 flex-1 bg-transparent text-[14px] font-medium text-navy outline-none",
            value.trim() ? "text-emerald-900" : "text-slate-500",
          )}
        />
      </div>
    </div>
  );
}

/** Listening flow-chart: vertical nodes with option bank or typed answers at gaps. */
export function FlowchartCompletionControl({
  title,
  answerMode = "option",
  nodes,
  options,
  answers,
  current,
  onAssign,
  onFocus,
  onPasteBlocked,
}: Props) {
  const [picked, setPicked] = useState<string | null>(null);
  const isTextMode = answerMode === "text";

  return (
    <div className="space-y-4">
      {!isTextMode && (
        <div className="flex flex-wrap gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3">
          <p className="w-full text-[12px] font-semibold uppercase tracking-wide text-slate-500">
            Options
          </p>
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
                {opt.label.replace(/^[A-G]\.?\s*/i, "") && (
                  <span className="ml-1.5">{opt.label.replace(/^[A-G]\.?\s*/i, "")}</span>
                )}
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
          {nodes.map((node, i) => (
            <div key={i} className="flex w-full flex-col items-center">
              {node.kind === "text" ? (
                <div className="w-full max-w-md rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-center text-[14px] font-medium text-slate-800">
                  {node.text}
                </div>
              ) : isTextMode ? (
                <TextGapNode
                  n={node.n}
                  value={answers[node.n] ?? ""}
                  isActive={current === node.n}
                  onAssign={(n, value) => onAssign(n, value)}
                  onFocus={onFocus}
                  onPasteBlocked={onPasteBlocked}
                />
              ) : (
                <OptionGapNode
                  n={node.n}
                  assigned={options.find((o) => o.id === answers[node.n])}
                  options={options}
                  isActive={current === node.n}
                  picked={picked}
                  onAssign={onAssign}
                  onFocus={onFocus}
                  setPicked={setPicked}
                />
              )}
              {i < nodes.length - 1 && (
                <ChevronDown className="my-0.5 h-5 w-5 shrink-0 text-slate-400" aria-hidden />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
