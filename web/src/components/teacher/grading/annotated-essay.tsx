"use client";

import { useMemo, useState } from "react";
import {
  CRITERION_ORDER,
  CRITERION_TONE_CLASSES,
  WRITING_MIN_WORDS,
  getWordCountStatus,
  type WritingAnnotation,
  type WritingCriterionId,
  type WritingTaskKey,
  WRITING_CRITERION_META,
} from "@/lib/writing/scoring";
import { cn } from "@/lib/utils";

type FilterKey = "all" | WritingCriterionId;

type EssayPart =
  | { kind: "text"; value: string }
  | { kind: "mark"; value: string; ann: WritingAnnotation; id: number };

function AnnotationPopover({ ann }: { ann: WritingAnnotation }) {
  const tone = WRITING_CRITERION_META[ann.criterion].tone;
  return (
    <div
      role="note"
      className="my-2 block w-full rounded-lg border border-border bg-white p-3 shadow-md"
    >
      <div className="flex items-start gap-2">
        <span
          className={cn(
            "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
            CRITERION_TONE_CLASSES[tone].pillSoft,
            "ring-1 ring-inset",
          )}
        >
          {WRITING_CRITERION_META[ann.criterion].short}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-navy">{ann.title}</p>
          <p className="mt-0.5 text-sm text-muted">{ann.explanation}</p>
          {ann.suggestion && (
            <p className="mt-1.5 text-xs text-sky-700">
              Suggested: {ann.suggestion}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function AnnotatedEssay({
  text,
  annotations,
  wordCount,
  task,
}: {
  text: string | null;
  annotations: WritingAnnotation[];
  wordCount: number;
  task: WritingTaskKey;
}) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [activeMarkId, setActiveMarkId] = useState<number | null>(null);
  const body = text?.trim() ?? "";
  const hasText = body.length > 0;
  const wordStatus = getWordCountStatus(task, wordCount);

  const filtered = useMemo(() => {
    if (filter === "all") return annotations;
    return annotations.filter((a) => a.criterion === filter);
  }, [annotations, filter]);

  const counts = useMemo(() => {
    const map: Record<WritingCriterionId, number> = {
      ta: 0,
      cc: 0,
      lr: 0,
      gra: 0,
    };
    for (const ann of annotations) {
      map[ann.criterion] += 1;
    }
    return map;
  }, [annotations]);

  const segments = useMemo((): EssayPart[] => {
    if (!hasText || filtered.length === 0) {
      return [{ kind: "text", value: body }];
    }

    const sorted = [...filtered].sort((a, b) => a.start - b.start || a.end - b.end);
    const parts: EssayPart[] = [];
    let cursor = 0;
    let markId = 0;

    for (const ann of sorted) {
      if (ann.end <= ann.start) continue;
      if (ann.start < cursor) continue;

      if (ann.start > cursor) {
        parts.push({ kind: "text", value: body.slice(cursor, ann.start) });
      }

      parts.push({
        kind: "mark",
        value: body.slice(ann.start, ann.end),
        ann,
        id: markId++,
      });
      cursor = ann.end;
    }

    if (cursor < body.length) {
      parts.push({ kind: "text", value: body.slice(cursor) });
    }

    return parts;
  }, [body, hasText, filtered]);

  const filterItems: [FilterKey, string][] = [
    ["all", `All (${annotations.length})`],
    ...CRITERION_ORDER.map(
      (id): [FilterKey, string] => [
        id,
        `${WRITING_CRITERION_META[id].short} (${counts[id]})`,
      ],
    ),
  ];

  return (
    <div className="rounded-xl border border-border bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-3">
        <p className="text-sm font-semibold text-navy">Candidate Response</p>
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          {filterItems.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setFilter(key);
                setActiveMarkId(null);
              }}
              disabled={!hasText}
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:cursor-default disabled:opacity-60",
                filter === key
                  ? key === "all"
                    ? "bg-navy text-white"
                    : CRITERION_TONE_CLASSES[
                        WRITING_CRITERION_META[key as WritingCriterionId].tone
                      ].pill
                  : "bg-slate-100 text-muted hover:bg-slate-200",
              )}
            >
              {label}
            </button>
          ))}
          <span
            className={cn(
              "ml-1 text-xs font-medium tabular-nums",
              wordStatus.meetsMinimum ? "text-muted" : "text-amber-700",
            )}
          >
            {wordCount} / {WRITING_MIN_WORDS[task]} words
          </span>
        </div>
      </div>

      {!wordStatus.meetsMinimum && hasText && (
        <div className="border-b border-amber-100 bg-amber-50 px-5 py-2.5 text-sm text-amber-900">
          Response is {wordCount} words — IELTS requires at least{" "}
          {wordStatus.minimum}. Task Achievement/Response should be penalised.
        </div>
      )}

      <div className="min-h-[8rem] px-5 py-4">
        {hasText ? (
          <div className="whitespace-pre-wrap text-left font-serif text-[15px] leading-8 text-foreground">
            {segments.map((part, i) => {
              if (part.kind === "text") {
                return <span key={i}>{part.value}</span>;
              }

              const isActive = activeMarkId === part.id;
              const tone = WRITING_CRITERION_META[part.ann.criterion].tone;

              return (
                <span key={i}>
                  <span
                    role="button"
                    tabIndex={0}
                    aria-expanded={isActive}
                    aria-label={`${WRITING_CRITERION_META[part.ann.criterion].short}: ${part.ann.title}`}
                    className={cn(
                      "inline cursor-pointer rounded-sm text-left align-baseline leading-[inherit]",
                      CRITERION_TONE_CLASSES[tone].highlight,
                      isActive && "ring-2 ring-navy/30 ring-offset-1",
                    )}
                    onClick={() =>
                      setActiveMarkId((prev) =>
                        prev === part.id ? null : part.id,
                      )
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setActiveMarkId((prev) =>
                          prev === part.id ? null : part.id,
                        );
                      }
                    }}
                  >
                    {part.value}
                  </span>
                  {isActive && (
                    <span className="mb-2 mt-1 block w-full text-left">
                      <AnnotationPopover ann={part.ann} />
                    </span>
                  )}
                </span>
              );
            })}
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-muted">
            No response submitted for this task.
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-border px-5 py-3.5 pb-4 text-[11px] leading-relaxed text-muted">
        {CRITERION_ORDER.map((id) => (
          <span key={id} className="inline-flex items-center gap-1.5">
            <span
              className={cn(
                "h-0.5 w-4 shrink-0 rounded-full",
                id === "ta" && "bg-sky-500",
                id === "cc" && "bg-violet-500",
                id === "lr" && "bg-emerald-500",
                id === "gra" && "bg-amber-500",
              )}
            />
            {WRITING_CRITERION_META[id].short} ={" "}
            {id === "ta"
              ? "Task Achievement / Response"
              : WRITING_CRITERION_META[id].label}
          </span>
        ))}
        <span className="text-muted">· Click a highlight to view feedback</span>
      </div>
    </div>
  );
}
