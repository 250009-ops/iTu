"use client";

import { useMemo, useState } from "react";
import {
  CRITERION_ORDER,
  CRITERION_TONE_CLASSES,
  type WritingAnnotation,
  type WritingCriterionId,
  WRITING_CRITERION_META,
} from "@/lib/writing/scoring";
import { cn } from "@/lib/utils";

type FilterKey = "all" | WritingCriterionId;

export function AnnotatedEssay({
  text,
  annotations,
  wordCount,
}: {
  text: string | null;
  annotations: WritingAnnotation[];
  wordCount: number;
}) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const body = text?.trim() ?? "";
  const hasText = body.length > 0;

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

  const segments = useMemo(() => {
    if (!hasText || filtered.length === 0) {
      return [{ kind: "text" as const, value: body }];
    }

    const sorted = [...filtered].sort((a, b) => a.start - b.start);
    const parts: Array<
      | { kind: "text"; value: string }
      | { kind: "mark"; value: string; ann: WritingAnnotation; id: number }
    > = [];

    let cursor = 0;
    sorted.forEach((ann, index) => {
      if (ann.start > cursor) {
        parts.push({ kind: "text", value: body.slice(cursor, ann.start) });
      }
      if (ann.end > ann.start) {
        parts.push({
          kind: "mark",
          value: body.slice(ann.start, ann.end),
          ann,
          id: index,
        });
      }
      cursor = Math.max(cursor, ann.end);
    });

    if (cursor < body.length) {
      parts.push({ kind: "text", value: body.slice(cursor) });
    }

    return parts;
  }, [body, hasText, filtered]);

  const hoveredAnn =
    hoveredId != null
      ? filtered.find((_, i) => i === hoveredId) ?? null
      : null;

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
              onClick={() => setFilter(key)}
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
          <span className="ml-1 text-xs font-medium tabular-nums text-muted">
            {wordCount} words
          </span>
        </div>
      </div>

      <div className="relative min-h-[8rem] px-5 py-4">
        {hasText ? (
          <div className="whitespace-pre-wrap font-serif text-[15px] leading-8 text-foreground">
            {segments.map((part, i) =>
              part.kind === "text" ? (
                <span key={i}>{part.value}</span>
              ) : (
                <span
                  key={i}
                  className={cn(
                    "cursor-help rounded-sm transition-colors",
                    CRITERION_TONE_CLASSES[
                      WRITING_CRITERION_META[part.ann.criterion].tone
                    ].highlight,
                    hoveredId === part.id && "ring-2 ring-navy/20",
                  )}
                  onMouseEnter={() => setHoveredId(part.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  {part.value}
                </span>
              ),
            )}
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-muted">
            No response submitted for this task.
          </p>
        )}

        {hoveredAnn && (
          <div className="pointer-events-none absolute bottom-4 left-5 right-5 z-10 rounded-lg border border-border bg-white p-3 shadow-lg">
            <div className="flex items-start gap-2">
              <span
                className={cn(
                  "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
                  CRITERION_TONE_CLASSES[
                    WRITING_CRITERION_META[hoveredAnn.criterion].tone
                  ].pillSoft,
                  "ring-1 ring-inset",
                )}
              >
                {WRITING_CRITERION_META[hoveredAnn.criterion].short}
              </span>
              <div>
                <p className="text-sm font-semibold text-navy">
                  {hoveredAnn.title}
                </p>
                <p className="mt-0.5 text-sm text-muted">
                  {hoveredAnn.explanation}
                </p>
                {hoveredAnn.suggestion && (
                  <p className="mt-1 text-xs text-sky-700">
                    Suggested: {hoveredAnn.suggestion}
                  </p>
                )}
              </div>
            </div>
          </div>
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
      </div>
    </div>
  );
}
